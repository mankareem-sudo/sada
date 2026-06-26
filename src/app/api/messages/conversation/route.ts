import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/messages/conversation?partnerId=xxx&limit=50
 * Returns messages between me and a partner.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const url = new URL(req.url)
  const partnerId = url.searchParams.get('partnerId')
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  if (!partnerId) return NextResponse.json({ error: 'missing partnerId' }, { status: 400 })

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: partnerId },
        { senderId: partnerId, receiverId: user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  // Mark unread messages as read
  await db.message.updateMany({
    where: { senderId: partnerId, receiverId: user.id, read: false },
    data: { read: true },
  }).catch(() => {})

  return NextResponse.json({ messages })
}
