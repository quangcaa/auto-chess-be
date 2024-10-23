"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const messages_1 = require("./messages");
const SocketManager_1 = require("./SocketManager");
const Game_1 = require("./Game");
const { sequelize, Game: DbGame, Move: DbMove, User: DbUser } = require('../db/models');
class GameManager {
    constructor() {
        this.games = [];
        this.pendingGameId = null;
        this.users = [];
    }
    // them user khoi phong
    addUser(user) {
        this.users.push(user);
        this.addHandler(user);
        console.log('run into addUser in GameManager');
        console.log(this.users);
        console.log(this.pendingGameId);
    }
    // xoa user khoi phong
    removeUser(socket) {
        const user = this.users.find((user) => user.socket === socket);
        if (!user) {
            console.error('User not found');
            return;
        }
        this.users = this.users.filter((user) => user.socket !== socket);
        SocketManager_1.socketManager.removeUser(user);
    }
    removeGame(game_id) {
        this.games = this.games.filter((g) => g.game_id !== game_id);
    }
    addHandler(user) {
        console.log(`run into addUser in addHandler`);
        user.socket.on('message', (data) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const message = JSON.parse(data.toString());
            console.log(`message: ${message}`);
            if (message.type === messages_1.INIT_GAME) {
                //  if game is pending
                if (this.pendingGameId) {
                    const game = this.games.find((x) => x.game_id === this.pendingGameId);
                    // check if game not found
                    if (!game) {
                        console.error('Pending game not found?');
                        return;
                    }
                    // check if connect to yourself
                    if (user.user_id === game.player1) {
                        SocketManager_1.socketManager.broadcast(game.game_id, JSON.stringify({
                            type: messages_1.GAME_ALERT,
                            payload: {
                                message: 'Trying to connect with yourself ?'
                            }
                        }));
                        return;
                    }
                    SocketManager_1.socketManager.addUser(user, game.game_id);
                    yield (game === null || game === void 0 ? void 0 : game.updateSecondPlayer(user.user_id));
                    this.pendingGameId = null;
                }
                else {
                    const game = new Game_1.Game(user.user_id, null);
                    this.games.push(game);
                    this.pendingGameId = game.game_id;
                    SocketManager_1.socketManager.addUser(user, game.game_id);
                    SocketManager_1.socketManager.broadcast(game.game_id, JSON.stringify({
                        type: messages_1.GAME_ADDED,
                        game_id: game.game_id
                    }));
                }
            }
            if (message.type === messages_1.MOVE) {
                const game_id = message.game_id;
                const game = this.games.find(game => game.game_id === game_id);
                if (game) {
                    game.makeMove(user, message.payload.move);
                    if (game.result) {
                        this.removeGame(game.game_id);
                    }
                }
            }
            if (message.type === messages_1.EXIT_GAME) {
                const game_id = message.game_id;
                const game = this.games.find((game) => game.game_id === game_id);
                if (game) {
                    game.exitGame(user);
                    this.removeGame(game.game_id);
                }
            }
            if (message.type === messages_1.JOIN_ROOM) {
                const game_id = (_a = message.payload) === null || _a === void 0 ? void 0 : _a.game_id;
                if (!game_id) {
                    return;
                }
                let availableGame = this.games.find((game) => game.game_id === game_id);
                const gameFromDb = yield DbGame.findByPk(game_id);
                // include ??
                // There is a game created but no second player available
                if (availableGame && !availableGame.player2) {
                    SocketManager_1.socketManager.addUser(user, availableGame.game_id);
                    yield availableGame.updateSecondPlayer(user.user_id);
                    return;
                }
                if (!gameFromDb) {
                    user.socket.send(JSON.stringify({
                        type: messages_1.GAME_NOT_FOUND,
                    }));
                    return;
                }
                if (gameFromDb.status !== GameStatus.IN_PROGRESS) {
                    user.socket.send(JSON.stringify({
                        type: messages_1.GAME_ENDED,
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
                    }));
                    return;
                }
                if (!availableGame) {
                    const game = new Game_1.Game(gameFromDb === null || gameFromDb === void 0 ? void 0 : gameFromDb.white_player_id, gameFromDb === null || gameFromDb === void 0 ? void 0 : gameFromDb.black_player_id, gameFromDb.game_id, gameFromDb.start_time);
                    // game.seedMoves(gameFromDb?.moves || [])
                    this.games.push(game);
                    availableGame = game;
                }
                console.log(availableGame.getPlayer1TimeConsumed());
                console.log(availableGame.getPlayer2TimeConsumed());
                user.socket.send(JSON.stringify({
                    type: messages_1.GAME_JOINED,
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
                }));
                SocketManager_1.socketManager.addUser(user, game_id);
            }
        }));
    }
}
exports.GameManager = GameManager;
