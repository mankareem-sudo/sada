import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/friends/reject
 * body: { friendshipId }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { friendshipId } = body as { friendshipId?: string }
  if (!friendshipId) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const friendship = await db.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.addresseeId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  await db.friendship.delete({ where: { id: friendshipId } })
  return NextResponse.json({ ok: true })
}
