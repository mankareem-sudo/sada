'use client'

import { io, Socket } from 'socket.io-client'
import { useEffect, useState, useCallback } from 'react'

const WS_URL = process.env.NODE_ENV === 'production' 
  ? ''  // Same origin via Caddy gateway
  : 'http://localhost:3003'

let socket: Socket | null = null

export function useRealtime(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return

    // Connect via gateway
    socket = io('/?XTransformPort=3003', {
      query: { userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      setIsConnected(true)
      console.log('[WS] Connected')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('[WS] Disconnected')
    })

    socket.on('user:online', (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId))
    })

    socket.on('user:offline', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [userId])

  // Listen for events
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socket) return
    socket.on(event, callback)
    return () => socket?.off(event, callback)
  }, [])

  // Emit events
  const emit = useCallback((event: string, data: any) => {
    socket?.emit(event, data)
  }, [])

  return { isConnected, onlineUsers, on, emit, socket }
}

// === Audio Room Hook ===
export function useAudioRoom(roomId: string | null, userId: string | undefined) {
  const [participants, setParticipants] = useState<any[]>([])
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set())
  const { on, emit } = useRealtime(userId)

  useEffect(() => {
    if (!roomId || !userId) return

    emit('room:join', { roomId })

    const offParticipants = on('room:participants', (data: any) => {
      setParticipants(data.participants || [])
    })

    const offJoined = on('room:user-joined', (data: any) => {
      setParticipants(prev => [...prev, { userId: data.userId, socketId: data.socketId }])
    })

    const offLeft = on('room:user-left', (data: any) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId))
      setMutedUsers(prev => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
    })

    const offMuted = on('rtc:user-muted', (data: any) => {
      setMutedUsers(prev => {
        const next = new Set(prev)
        if (data.muted) next.add(data.userId)
        else next.delete(data.userId)
        return next
      })
    })

    return () => {
      emit('room:leave', { roomId })
      offParticipants?.()
      offJoined?.()
      offLeft?.()
      offMuted?.()
    }
  }, [roomId, userId, on, emit])

  return { participants, mutedUsers, emit }
}
