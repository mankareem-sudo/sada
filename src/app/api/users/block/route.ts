import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/users/block
 * body: { targetUserId, action: 'block' | 'unblock' }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { targetUserId, action } = body as { targetUserId?: string; action?: 'block' | 'unblock' }
  if (!targetUserId || !action || targetUserId === user.id) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  if (action === 'block') {
    try {
      await db.block.create({ data: { id: generateId(), blockerId: user.id, blockedId: targetUserId, createdAt: new Date().toISOString() } })
      // Also unfollow + remove friendship
      await db.follow.deleteMany({ where: { OR: [{ followerId: user.id, followeeId: targetUserId }, { followerId: targetUserId, followeeId: user.id }] } }).catch(() => {})
      await db.friendship.deleteMany({ where: { OR: [{ requesterId: user.id, addresseeId: targetUserId }, { requesterId: targetUserId, addresseeId: user.id }] } }).catch(() => {})
    } catch {}
  } else {
    await db.block.deleteMany({ where: { blockerId: user.id, blockedId: targetUserId } })
  }

  return NextResponse.json({ ok: true, blocked: action === 'block' })
}

/**
 * GET /api/users/block
 * Returns list of blocked users.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const blocks = await db.block.findMany({ where: { blockerId: user.id } })
  const blockedIds = blocks.map((b: any) => b.blockedId)
  const users = blockedIds.length > 0 ? await db.user.findMany({ where: { id: { in: blockedIds } } }) : []
  
  return NextResponse.json({
    blockedUsers: users.map((u: any) => ({
      id: u.id, name: u.name, username: u.username, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl,
    })),
  })
}
