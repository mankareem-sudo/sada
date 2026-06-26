/**
 * Sada Realtime Service — WebSocket server for live updates
 * 
 * Features:
 * - Live notifications (likes, comments, follows, messages)
 * - Live new posts in feed
 * - Online status
 * - Typing indicators in DMs
 * - WebRTC signaling for live audio rooms
 * 
 * Port: 3003
 */

import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'

const PORT = 3003

const httpServer = new HttpServer()
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Allow Caddy gateway to proxy
  path: '/',
})

// === Online users tracking ===
const onlineUsers = new Map<string, Set<string>>() // userId -> Set<socketId>

interface AuthData {
  userId?: string
  username?: string
}

// === Authentication middleware ===
io.use((socket: Socket, next) => {
  const userId = socket.handshake.query.userId as string
  if (!userId) {
    return next(new Error('Unauthorized'))
  }
  ;(socket as any).userId = userId
  next()
})

// === Connection handler ===
io.on('connection', (socket: Socket) => {
  const userId = (socket as any).userId as string
  console.log(`[WS] User connected: ${userId}`)

  // Join personal room
  socket.join(`user:${userId}`)

  // Track online
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set())
  }
  onlineUsers.get(userId)!.add(socket.id)

  // Broadcast online status
  io.emit('user:online', { userId })

  // === Join audio room ===
  socket.on('room:join', (data: { roomId: string }) => {
    socket.join(`room:${data.roomId}`)
    io.to(`room:${data.roomId}`).emit('room:user-joined', { userId, socketId: socket.id })
    // Send current participants
    const roomSockets = io.sockets.adapter.rooms.get(`room:${data.roomId}`)
    if (roomSockets) {
      const participants = Array.from(roomSockets).map(sid => {
        const s = io.sockets.sockets.get(sid)
        return { userId: (s as any)?.userId, socketId: sid }
      }).filter(p => p.userId)
      socket.emit('room:participants', { participants })
    }
  })

  // === Leave audio room ===
  socket.on('room:leave', (data: { roomId: string }) => {
    socket.leave(`room:${data.roomId}`)
    io.to(`room:${data.roomId}`).emit('room:user-left', { userId, socketId: socket.id })
  })

  // === WebRTC signaling ===
  socket.on('rtc:offer', (data: { to: string; sdp: any }) => {
    io.to(data.to).emit('rtc:offer', { from: socket.id, sdp: data.sdp })
  })

  socket.on('rtc:answer', (data: { to: string; sdp: any }) => {
    io.to(data.to).emit('rtc:answer', { from: socket.id, sdp: data.sdp })
  })

  socket.on('rtc:ice-candidate', (data: { to: string; candidate: any }) => {
    io.to(data.to).emit('rtc:ice-candidate', { from: socket.id, candidate: data.candidate })
  })

  socket.on('rtc:mute', (data: { roomId: string; muted: boolean }) => {
    io.to(`room:${data.roomId}`).emit('rtc:user-muted', { userId, muted: data.muted })
  })

  // === Typing indicator (DMs) ===
  socket.on('typing:start', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('typing:start', { userId })
  })

  socket.on('typing:stop', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('typing:stop', { userId })
  })

  // === Disconnect ===
  socket.on('disconnect', () => {
    console.log(`[WS] User disconnected: ${userId}`)
    const userSockets = onlineUsers.get(userId)
    if (userSockets) {
      userSockets.delete(socket.id)
      if (userSockets.size === 0) {
        onlineUsers.delete(userId)
        io.emit('user:offline', { userId })
      }
    }
  })
})

// === REST API for server-to-client push ===
// Other services (Next.js API routes) can POST to push notifications
io.of('/push').on('connection', (socket: Socket) => {
  socket.on('notify', (data: { userId: string; event: string; payload: any }) => {
    io.to(`user:${data.userId}`).emit(data.event, data.payload)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[WS] Sada Realtime running on port ${PORT}`)
})
