import jwt from 'jsonwebtoken'
import { User } from '../SocketManager'
import { WebSocket } from 'ws'

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string

export const extractAuthUser = (token: string, ws: WebSocket): User => {
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET)
        const user_id = (typeof decoded !== 'string' && 'payload' in decoded) ? decoded.payload.user_id : null
        if (!user_id) {
            throw new Error('Invalid token payload')
        }
        return new User(ws, user_id)
    } catch (error) {
        console.error('Token verification failed:', error)
        throw new Error('Invalid token')
    }
}
