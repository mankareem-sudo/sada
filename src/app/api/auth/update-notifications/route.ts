import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * PATCH /api/auth/update-notifications
 * body: { notifLikes?, notifComments?, notifFollows?, notifMessages?, notifFriendRequests? }
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const data: any = {}

  for (const key of ['notifLikes', 'notifComments', 'notifFollows', 'notifMessages', 'notifFriendRequests']) {
    if (typeof body[key] === 'boolean') {
      data[key] = body[key]
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'مفيش بيانات' }, { status: 400 })
  }

  await db.user.update({ where: { id: user.id }, data })
  return NextResponse.json({ ok: true })
}
