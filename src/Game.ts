import { WebSocket } from "ws"
import { Chess, Move, Square } from "chess.js"
import { randomUUID } from "crypto"

import { socketManager, User } from "./SocketManager"
import { GAME_ENDED, INIT_GAME, MOVE } from "./messages"
import { Transaction } from "sequelize"

const { sequelize, Game: DbGame, Move: DbMove, User: DbUser } = require('../db/models')
const { Op } = require('sequelize')

type GAME_STATUS = 'IN PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'TIME_UP' | 'PLAYER_EXIT'
type GAME_RESULT = 'WHITE_WINS' | 'DRAW' | 'BLACK_WINS'

const GAME_TIME_MS = 10 * 60 * 60 * 1000

// promoting
export function isPromoting(chess: Chess, from: Square, to: Square) {
    if (!from) {
        return false
    }

    const piece = chess.get(from)

    if (piece?.type !== 'p') {
        return false
    }

    if (piece.color !== chess.turn()) {
        return false
    }

    if (!['1', '8'].some((it) => to.endsWith(it))) {
        return false
    }

    return chess
        .moves({ square: from, verbose: true })
        .map((it) => it.to)
        .includes(to)
}

// game class
export class Game {
    public game_id: string
    public player1: string
    public player2: string | null
    public board: Chess
    public result: GAME_RESULT | null = null
    private moveCount = 0
    private timer: NodeJS.Timeout | null = null
    private moveTimer: NodeJS.Timeout | null = null
    private startTime = new Date(Date.now())
    private lastMoveTime = new Date(Date.now())
    private player1TimeConsumed = 0
    private player2TimeConsumed = 0

    constructor(player1: string, player2: string | null, game_id?: string, startTime?: Date) {
        this.player1 = player1
        this.player2 = player2
        this.board = new Chess()
        this.game_id = game_id ?? randomUUID()
        if (startTime) {
            this.startTime = startTime
            this.lastMoveTime = startTime
        }
    }

    seedMoves(moves: {
        id: string
        game_id: string
        move_number: number
        from: string
        to: string
        comments: string | null
        time_taken: number | null
        created_at: Date
    }[]) {

    }


    async updateSecondPlayer(player2: string) {
        this.player2 = player2

        const users = await DbUser.findAll({
            where: {
                [Op.in]: [
                    this.player1,
                    this.player2 ?? ''
                ]
            }
        })

        try {
            await this.createGameInDb()
        } catch (e) {
            console.error(e)
            return
        }

        const WhitePlayer = users.find((user: { user_id: string }) => user.user_id === this.player1)
        const BlackPlayer = users.find((user: { user_id: string }) => user.user_id === this.player2)

        socketManager.broadcast(
            this.game_id,
            JSON.stringify({
                type: INIT_GAME,
                payload: {
                    gameId: this.game_id,
                    whitePlayer: {
                        name: WhitePlayer?.username,
                        user_id: this.player1
                    },
                    blackPlayer: {
                        name: BlackPlayer?.username,
                        user_id: this.player2,
                    },
                    fen: this.board.fen(),
                    moves: [],
                },
            }),
        )
    }


    // create game in db
    async createGameInDb() {
        this.startTime = new Date(Date.now())
        this.lastMoveTime = this.startTime

        const game = await DbGame.create({
            game_id: this.game_id,
            variant_id: 'standard',
            time_control_id: 'Ra1',
            rated: 0,
            white_player_id: this.player1,
            black_player_id: this.player2 ?? null,
            start_time: this.startTime,
            status: 'IN_PROGRESS',
            starting_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        })

        this.game_id = game.game_id
    }


    // save move to db
    async addMoveToDb(move: Move, moveTimestamp: Date) {
        const transaction: Transaction = await sequelize.transaction()

        try {
            await DbMove.create({
                game_id: this.game_id,
                from: move.from,
                to: move.to,
                before: move.before,
                after: move.after,
                move_number: this.moveCount + 1,
                san: move.san,
                time_taken: moveTimestamp.getTime() - this.lastMoveTime.getTime(),
                created_at: moveTimestamp,
            }, { transaction })

            await DbGame.update(
                { current_fen: move.after },
                { where: { game_id: this.game_id }, transaction }
            )

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }


    async makeMove(user: User, move: Move) {
        // Check if the move is made by the correct player
        if (this.board.turn() === 'w' && user.user_id !== this.player1) {
            return
        }
        if (this.board.turn() === 'b' && user.user_id !== this.player2) {
            return
        }

        if (this.result) {
            console.error(`User ${user.user_id} is making a move post game completion`)
            return
        }

        const moveTimestamp = new Date(Date.now())

        try {
            if (isPromoting(this.board, move.from, move.to)) {
                this.board.move({
                    from: move.from,
                    to: move.to,
                    promotion: 'q',
                })
            } else {
                this.board.move({
                    from: move.from,
                    to: move.to,
                })
            }
        } catch (error) {
            console.log(`Error while making move: ${error}`)
            return
        }

        // flipped because move has already happened
        if (this.board.turn() === 'b') {
            this.player1TimeConsumed = this.player1TimeConsumed + (moveTimestamp.getTime() - this.lastMoveTime.getTime())
        }
        if (this.board.turn() === 'w') {
            this.player2TimeConsumed = this.player2TimeConsumed + (moveTimestamp.getTime() - this.lastMoveTime.getTime())
        }

        // add move to db 
        await this.addMoveToDb(move, moveTimestamp)

        this.resetAbandonTimer()
        this.resetMoveTimer()

        this.lastMoveTime = moveTimestamp

        socketManager.broadcast(
            this.game_id,
            JSON.stringify({
                type: MOVE,
                payload: {
                    move,
                    player1TimeConsumed: this.player1TimeConsumed,
                    player2TimeConsumed: this.player2TimeConsumed,
                }
            })
        )

        if (this.board.isGameOver()) {
            const result = this.board.isDraw()
                ? 'DRAW'
                : this.board.turn() === 'b'
                    ? 'WHITE_WINS'
                    : 'BLACK_WINS'

            this.endGame("COMPLETED", result)
        }

        // increase move count
        this.moveCount++
    }


    // get player time consumed 
    getPlayer1TimeConsumed() {
        if (this.board.turn() === 'w') {
            return this.player1TimeConsumed + (new Date(Date.now()).getTime() - this.lastMoveTime.getTime())
        }

        return this.player1TimeConsumed
    }

    getPlayer2TimeConsumed() {
        if (this.board.turn() === 'b') {
            return this.player2TimeConsumed + (new Date(Date.now()).getTime() - this.lastMoveTime.getTime())
        }

        return this.player2TimeConsumed
    }


    async resetAbandonTimer() {
        if (this.timer) {
            clearTimeout(this.timer)
        }

        this.timer = setTimeout(() => {
            this.endGame("ABANDONED", this.board.turn() === 'b' ? 'WHITE_WINS' : 'BLACK_WINS')
        }, 60 * 1000)
    }

    async resetMoveTimer() {
        if (this.moveTimer) {
            clearTimeout(this.moveTimer)
        }
        const turn = this.board.turn()
        const timeLeft = GAME_TIME_MS - (turn === 'w' ? this.player1TimeConsumed : this.player2TimeConsumed)

        this.moveTimer = setTimeout(() => {
            this.endGame("TIME_UP", turn === 'b' ? 'WHITE_WINS' : 'BLACK_WINS')
        }, timeLeft)
    }


    async exitGame(user: User) {
        this.endGame('PLAYER_EXIT', user.user_id === this.player2 ? 'WHITE_WINS' : 'BLACK_WINS')
    }

    // end game
    async endGame(status: GAME_STATUS, result: GAME_RESULT) {
        const updatedGame = await DbGame.update(
            {
                status,
                result
            },
            { where: { game_id: this.game_id } }
        )

        const gameWithDetails = await DbGame.findOne({
            where: { game_id: this.game_id },
            include: [
                {
                    model: DbMove,
                    order: [['move_number', 'ASC']]
                },
                { model: DbUser, as: 'blackPlayer' },
                { model: DbUser, as: 'whitePlayer' }
            ]
        })

        socketManager.broadcast(
            this.game_id,
            JSON.stringify({
                type: GAME_ENDED,
                payload: {
                    result,
                    status,
                    moves: gameWithDetails.moves,
                    blackPlayer: {
                        user_id: gameWithDetails.blackPlayer.id,
                    },
                    whitePlayer: {
                        id: gameWithDetails.whitePlayer.id,
                    },
                },
            }),
        )

        this.clearTimer()
        this.clearMoveTimer()
    }

    clearMoveTimer() {
        if (this.moveTimer) clearTimeout(this.moveTimer)
    }

    setTimer(timer: NodeJS.Timeout) {
        this.timer = timer
    }

    clearTimer() {
        if (this.timer) clearTimeout(this.timer)
    }
}