"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketManager = exports.User = void 0;
const crypto_1 = require("crypto");
class User {
    constructor(socket, user_id) {
        this.socket = socket;
        this.user_id = user_id;
        this.id = (0, crypto_1.randomUUID)();
    }
}
exports.User = User;
class SocketManager {
    constructor() {
        this.interestedSockets = new Map();
        this.userRoomMappping = new Map();
    }
    static getInstance() {
        if (SocketManager.instance) {
            return SocketManager.instance;
        }
        SocketManager.instance = new SocketManager();
        return SocketManager.instance;
    }
    addUser(user, room_id) {
        this.interestedSockets.set(room_id, [
            ...(this.interestedSockets.get(room_id) || []),
            user,
        ]);
        this.userRoomMappping.set(user.user_id, room_id);
        console.log(this.interestedSockets);
    }
    broadcast(room_id, message) {
        const users = this.interestedSockets.get(room_id);
        if (!users) {
            console.error('No users in room?');
            return;
        }
        users.forEach((user) => {
            user.socket.send(message);
        });
    }
    removeUser(user) {
        var _a;
        const room_id = this.userRoomMappping.get(user.user_id);
        if (!room_id) {
            console.error('User was not interested in any room?');
            return;
        }
        const room = this.interestedSockets.get(room_id) || [];
        const remainingUsers = room.filter(u => u.user_id !== user.user_id);
        this.interestedSockets.set(room_id, remainingUsers);
        if (((_a = this.interestedSockets.get(room_id)) === null || _a === void 0 ? void 0 : _a.length) === 0) {
            this.interestedSockets.delete(room_id);
        }
        this.userRoomMappping.delete(user.user_id);
    }
}
exports.socketManager = SocketManager.getInstance();
