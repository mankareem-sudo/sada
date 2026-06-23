import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/friends/remove
 * body: { friendUserId }
 * Removes a friendship (unfriend).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { friendUserId } = body as { friendUserId?: string }
  if (!friendUserId) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  await db.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: friendUserId, status: 'accepted' },
        { requesterId: friendUserId, addresseeId: user.id, status: 'accepted' },
      ],
    },
  })

  return NextResponse.json({ ok: true })
}
