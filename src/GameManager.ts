import { WebSocket } from "ws"

import { EXIT_GAME, GAME_ADDED, GAME_ALERT, GAME_ENDED, GAME_JOINED, GAME_NOT_FOUND, INIT_GAME, JOIN_ROOM, MOVE } from "./messages"
import { socketManager, User } from "./SocketManager"
import { Game } from "./Game"

const { sequelize, Game: DbGame, Move: DbMove, User: DbUser } = require('../db/models')


export class GameManager {
    private games: Game[]
    private pendingGameId: string | null
    private users: User[]

    constructor() {
        this.games = []
        this.pendingGameId = null
        this.users = []
    }

    // them user khoi phong
    addUser(user: User) {
        this.users.push(user)
        this.addHandler(user)

        console.log('run into addUser in GameManager')
        console.log(this.users)
        console.log(this.pendingGameId)
    }

    // xoa user khoi phong
    removeUser(socket: WebSocket) {
        const user = this.users.find((user) => user.socket === socket)
        if (!user) {
            console.error('User not found')
            return
        }
        this.users = this.users.filter((user) => user.socket !== socket)
        socketManager.removeUser(user)
    }

    removeGame(game_id: string) {
        this.games = this.games.filter((g) => g.game_id !== game_id)
    }

    private addHandler(user: User) {
        console.log(`run into addUser in addHandler`)

        user.socket.on('message', async (data) => {
            const message = JSON.parse(data.toString())
            console.log(`message: ${message}`)
            if (message.type === INIT_GAME) {
                //  if game is pending
                if (this.pendingGameId) {
                    const game = this.games.find((x) => x.game_id === this.pendingGameId)

                    // check if game not found
                    if (!game) {
                        console.error('Pending game not found?')
                        return
                    }

                    // check if connect to yourself
                    if (user.user_id === game.player1) {
                        socketManager.broadcast(
                            game.game_id,
                            JSON.stringify({
                                type: GAME_ALERT,
                                payload: {
                                    message: 'Trying to connect with yourself ?'
                                }
                            })
                        )
                        return
                    }

                    socketManager.addUser(user, game.game_id)
                    await game?.updateSecondPlayer(user.user_id)
                    this.pendingGameId = null
                } else {
                    const game = new Game(user.user_id, null)
                    this.games.push(game)
                    this.pendingGameId = game.game_id

                    socketManager.addUser(user, game.game_id)
                    socketManager.broadcast(
                        game.game_id,
                        JSON.stringify({
                            type: GAME_ADDED,
                            game_id: game.game_id
                        })
                    )
                }
            }

            if (message.type === MOVE) {
                const game_id = message.game_id
                const game = this.games.find(game => game.game_id === game_id)

                if (game) {
                    game.makeMove(user, message.payload.move)
                    if (game.result) {
                        this.removeGame(game.game_id)
                    }
                }
            }

            if (message.type === EXIT_GAME) {
                const game_id = message.game_id
                const game = this.games.find((game) => game.game_id === game_id)

                if (game) {
                    game.exitGame(user)
                    this.removeGame(game.game_id)
                }
            }

            if (message.type === JOIN_ROOM) {
                const game_id = message.payload?.game_id
                if (!game_id) {
                    return
                }

                let availableGame = this.games.find((game) => game.game_id === game_id)
                const gameFromDb = await DbGame.findByPk(game_id)
                // include ??

                // There is a game created but no second player available
                if (availableGame && !availableGame.player2) {
                    socketManager.addUser(user, availableGame.game_id)
                    await availableGame.updateSecondPlayer(user.user_id)
                    return
                }

                if (!gameFromDb) {
                    user.socket.send(
                        JSON.stringify({
                            type: GAME_NOT_FOUND,
                        }),
                    )
                    return
                }

                if (gameFromDb.status !== GameStatus.IN_PROGRESS) {
                    user.socket.send(JSON.stringify({
                        type: GAME_ENDED,
                        payload: {
                            result: gameFromDb.result,
                            status: gameFromDb.status,
                            // moves: gameFromDb.moves,
                            // blackPlayer: {
                            //     id: gameFromDb.blackPlayer.id,
                            //     name: gameFromDb.blackPlayer.name,
                            // },
                            // whitePlayer: {
                            //     id: gameFromDb.whitePlayer.id,
                            //     name: gameFromDb.whitePlayer.name,
                            // },
                        }
                    }))
                    return
                }

                if (!availableGame) {
                    const game = new Game(
                        gameFromDb?.white_player_id!,
                        gameFromDb?.black_player_id!,
                        gameFromDb.game_id,
                        gameFromDb.start_time,
                    )
                    // game.seedMoves(gameFromDb?.moves || [])
                    this.games.push(game)
                    availableGame = game
                }

                console.log(availableGame.getPlayer1TimeConsumed())
                console.log(availableGame.getPlayer2TimeConsumed())

                user.socket.send(
                    JSON.stringify({
                        type: GAME_JOINED,
                        payload: {
                            game_id,
                            // moves: gameFromDb.moves,
                            // blackPlayer: {
                            //     id: gameFromDb.blackPlayer.id,
                            //     name: gameFromDb.blackPlayer.name,
                            // },
                            // whitePlayer: {
                            //     id: gameFromDb.whitePlayer.id,
                            //     name: gameFromDb.whitePlayer.name,
                            // },
                            player1TimeConsumed: availableGame.getPlayer1TimeConsumed(),
                            player2TimeConsumed: availableGame.getPlayer2TimeConsumed(),
                        },
                    }),
                )

                socketManager.addUser(user, game_id)
            }
        })
    }
}