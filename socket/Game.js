const { Chess } = require('chess.js')
const { sequelize, Game: DbGame, Move: DbMove, User: DbUser } = require('../db/models')
const { PLAYER_EXIT, BLACK_WINS, WHITE_WINS, COMPLETED, GAME_OVER, MOVE, DRAW, RECEIVE_MESSAGE } = require('./message')


class Game {
    constructor(player1, player2, game_id) {
        this.game_id = game_id
        this.player1 = player1
        this.player2 = player2
        this.board = new Chess()
        this.result = null
        this.moveCount = 0
        this.timer = null // dong ho tong
        this.moveTimer = null // dong ho move
        this.startTime = new Date(Date.now()) // thoi gian bat dau
        this.lastMoveTime = new Date(Date.now())
        // this.player1TimeConsumed = 0
        // this.player2TimeConsumed = 0

        this.player1Time = 10 * 60 * 1000;
        this.player2Time = 10 * 60 * 1000;
    }

    async addPlayer(player2) {
        this.player2 = player2

        try {
            await this.createGameInDb()
        } catch (error) {
            console.log(error)
            return
        }
    }

    async makeMove(socket, move, callback, io) {
        if ((this.board.turn() === 'w' && socket.user_id !== this.player1) ||
            (this.board.turn() === 'b' && socket.user_id !== this.player2)) {
            console.log(`error move`)
            callback({ success: false, message: 'Không phải lượt của bạn.' })
            return
        }

        let result
        try {
            result = this.board.move(move)
        } catch (error) {
            console.error(`Invalid move attempted: ${JSON.stringify(move)}`, error);
            callback({ success: false, message: 'Nước đi không hợp lệ.' })
            return
        }

        if (!result) {
            callback({ success: false, message: 'Nước đi không hợp lệ.' })
            return
        }

        const moveTimestamp = new Date(Date.now())
        await this.addMoveToDb(result, moveTimestamp)

        socket.to(this.game_id).emit(MOVE, result)
        callback({ success: true })

        // Check if the game is over after the move
        if (this.board.isGameOver()) {
            let result

            if (this.board.isCheckmate()) {
                result = this.board.turn() === 'w' ? BLACK_WINS : WHITE_WINS;
            }
            else if (
                this.board.isStalemate() ||
                this.board.isInsufficientMaterial() ||
                this.board.isThreefoldRepetition() ||
                this.board.isDraw() ||
                this.board.ply() >= 1000
            ) {
                result = DRAW;
            }

            await this.endGame(COMPLETED, result)

            io.to(this.game_id).emit(GAME_OVER, result)
        }
    }

    sendMessage(socket, message, io) {
        io.to(this.game_id).emit(RECEIVE_MESSAGE, message)
    }

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
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        })
    }

    async addMoveToDb(move, moveTimestamp) {
        const transaction = await sequelize.transaction()

        console.log(move)

        try {
            await DbMove.create({
                game_id: this.game_id,
                from: move.from,
                to: move.to,
                before: move.before,
                after: move.after,
                move_number: this.moveCount += 1,
                san: move.san,
                time_taken: moveTimestamp.getTime() - this.lastMoveTime.getTime(),
                created_at: moveTimestamp,
            }, { transaction })

            await DbGame.update(
                { fen: move.after },
                { where: { game_id: this.game_id }, transaction }
            )

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    async exitGame(user_id) {
        console.log('ran into Game/exitGame')

        this.endGame(PLAYER_EXIT, user_id === this.player1 ? BLACK_WINS : WHITE_WINS)

        return user_id === this.player1 ? BLACK_WINS : WHITE_WINS
    }

    async endGame(status, result) {
        const updatedGame = await DbGame.update(
            { status, result },
            { where: { game_id: this.game_id } }
        )

        const gameDetails = await DbGame.findOne({
            where: { game_id: this.game_id },
            include: [
                {
                    model: DbMove,
                    as: 'moves', // This should match the alias in Game.hasMany
                },
                {
                    model: DbUser,
                    as: 'game_black_player_id_fk', // Update alias to match Game's association
                    attributes: ['user_id', 'username']
                },
                {
                    model: DbUser,
                    as: 'game_white_player_id_fk', // Update alias to match Game's association
                    attributes: ['user_id', 'username']
                }
            ],
            order: [
                [{ model: DbMove, as: 'moves' }, 'move_number', 'ASC']
            ]
        })

        console.log(gameDetails)

        /*
        * send socket
        */
    }
}

module.exports = { Game }