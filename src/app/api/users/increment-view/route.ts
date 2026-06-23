import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/users/increment-view
 * body: { userId }
 * Increments profile view counter (for analytics)
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: true })

  const body = await req.json()
  const { userId } = body as { userId?: string }
  if (!userId || userId === user.id) return NextResponse.json({ ok: true })

  await db.user.update({ where: { id: userId }, data: { profileViews: { increment: 1 } } })
  return NextResponse.json({ ok: true })
}
