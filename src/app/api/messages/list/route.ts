import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/messages/list
 * Returns list of conversations (latest message per friend).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  // Get all messages involving the user
  const messages = await db.message.findMany({
    where: {
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  // Group by conversation partner
  const conversationsMap = new Map<string, any>()
  
  for (const msg of messages as any[]) {
    const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId
    
    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        partnerId,
        lastMessage: msg,
        unreadCount: 0,
      })
    }
    
    // Count unread
    if (msg.receiverId === user.id && !msg.read) {
      conversationsMap.get(partnerId).unreadCount++
    }
  }

  // Get user info for each partner
  const partnerIds = [...conversationsMap.keys()]
  const partners = partnerIds.length > 0
    ? await db.user.findMany({ where: { id: { in: partnerIds } } })
    : []
  const partnerMap = new Map(partners.map((p: any) => [p.id, p]))

  const conversations = [...conversationsMap.values()]
    .map((c) => {
      const partner = partnerMap.get(c.partnerId) as any
      return {
        partnerId: c.partnerId,
        lastMessage: {
          id: c.lastMessage.id,
          content: c.lastMessage.content,
          imageUrl: c.lastMessage.imageUrl,
          voiceData: c.lastMessage.voiceData,
          voiceDuration: c.lastMessage.voiceDuration,
          senderId: c.lastMessage.senderId,
          createdAt: c.lastMessage.createdAt,
        },
        unreadCount: c.unreadCount,
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          username: partner.username,
          avatarColor: partner.avatarColor,
          avatarUrl: partner.avatarUrl,
        } : null,
      }
    })
    .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())

  return NextResponse.json({ conversations })
}
