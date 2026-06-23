import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/push/subscribe
 * body: { endpoint, keys }
 * Saves a push subscription for the current user.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { endpoint, keys } = body as { endpoint?: string; keys?: any }

  if (!endpoint || !keys) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // Check if already exists
  const existing = await db.pushSubscription.findFirst({
    where: { userId: user.id, endpoint },
  })

  if (!existing) {
    await db.pushSubscription.create({
      data: {
        id: generateId(),
        userId: user.id,
        endpoint,
        keys: JSON.stringify(keys),
        createdAt: new Date().toISOString(),
      },
    })
  }

  return NextResponse.json({ ok: true })
}
