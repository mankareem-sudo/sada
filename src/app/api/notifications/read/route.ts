import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/notifications/read
 * body: { id?: string, all?: boolean }
 * Marks a single notification or all as read.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { id, all } = body as { id?: string; all?: boolean }

  if (all) {
    await db.notification.updateMany({
      where: { recipientId: user.id, read: false },
      data: { read: true },
    })
    return NextResponse.json({ ok: true, allMarked: true })
  }

  if (id) {
    await db.notification.updateMany({
      where: { id, recipientId: user.id },
      data: { read: true },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'missing id or all' }, { status: 400 })
}
