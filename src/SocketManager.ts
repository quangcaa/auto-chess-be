import { randomUUID } from 'crypto'
import { WebSocket } from 'ws'

export class User {
  public socket: WebSocket
  public id: string
  public user_id: string

  constructor(socket: WebSocket, user_id: string) {
    this.socket = socket
    this.user_id = user_id
    this.id = randomUUID()
  }
}

class SocketManager {
  private static instance: SocketManager
  private interestedSockets: Map<string, User[]>
  private userRoomMappping: Map<string, string>

  private constructor() {
    this.interestedSockets = new Map<string, User[]>()
    this.userRoomMappping = new Map<string, string>()
  }

  static getInstance() {
    if (SocketManager.instance) {
      return SocketManager.instance
    }

    SocketManager.instance = new SocketManager()
    return SocketManager.instance
  }

  addUser(user: User, room_id: string) {
    this.interestedSockets.set(room_id, [
      ...(this.interestedSockets.get(room_id) || []),
      user,
    ])
    this.userRoomMappping.set(user.user_id, room_id)

    console.log(this.interestedSockets)
  }

  broadcast(room_id: string, message: string) {
    const users = this.interestedSockets.get(room_id)
    if (!users) {
      console.error('No users in room?')
      return
    }

    users.forEach((user) => {
      user.socket.send(message)
    })
  }

  removeUser(user: User) {
    const room_id = this.userRoomMappping.get(user.user_id)
    if (!room_id) {
      console.error('User was not interested in any room?')
      return
    }
    const room = this.interestedSockets.get(room_id) || []
    const remainingUsers = room.filter(u =>
      u.user_id !== user.user_id
    )
    this.interestedSockets.set(
      room_id,
      remainingUsers
    )
    if (this.interestedSockets.get(room_id)?.length === 0) {
      this.interestedSockets.delete(room_id)
    }
    this.userRoomMappping.delete(user.user_id)
  }
}

export const socketManager = SocketManager.getInstance()