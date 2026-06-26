import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/friends/list?type=received|sent|accepted&userId=xxx
 * 
 * - received: pending requests addressed to me
 * - sent: pending requests I sent
 * - accepted: all my friends
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'accepted'
  const targetUserId = url.searchParams.get('userId') || user.id

  // If viewing someone else's profile, only show accepted friends
  const isMe = targetUserId === user.id

  let friendships: any[] = []

  if (type === 'received' && isMe) {
    friendships = await db.friendship.findMany({
      where: { addresseeId: user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })
  } else if (type === 'sent' && isMe) {
    friendships = await db.friendship.findMany({
      where: { requesterId: user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    // accepted friends
    friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: targetUserId, status: 'accepted' },
          { addresseeId: targetUserId, status: 'accepted' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  // Get user info for each friendship
  const userIds = friendships.map((f: any) => 
    type === 'received' ? f.requesterId : type === 'sent' ? f.addresseeId : 
    (f.requesterId === targetUserId ? f.addresseeId : f.requesterId)
  )
  
  const uniqueUserIds = [...new Set(userIds)]
  const users = uniqueUserIds.length > 0 
    ? await db.user.findMany({ where: { id: { in: uniqueUserIds } } })
    : []
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  const result = friendships.map((f: any) => {
    const otherUserId = type === 'received' ? f.requesterId : type === 'sent' ? f.addresseeId :
      (f.requesterId === targetUserId ? f.addresseeId : f.requesterId)
    const otherUser = userMap.get(otherUserId) as any
    
    return {
      id: f.id,
      status: f.status,
      createdAt: f.createdAt,
      user: otherUser ? {
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username,
        avatarColor: otherUser.avatarColor,
        avatarUrl: otherUser.avatarUrl,
        bio: otherUser.bio,
      } : null,
    }
  })

  return NextResponse.json({ friends: result })
}
