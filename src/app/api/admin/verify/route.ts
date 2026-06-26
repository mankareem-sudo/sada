import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/admin/verify
 * body: { userId }
 * Toggles verified badge (admin only)
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const body = await req.json()
  const { userId } = body as { userId?: string }
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

  const target = await db.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await db.user.update({ where: { id: userId }, data: { isVerified: !target.isVerified } })
  return NextResponse.json({ ok: true, isVerified: !target.isVerified })
}
