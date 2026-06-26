import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@sada.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

/**
 * POST /api/push/send
 * body: { userId, title, body, url }
 * Sends a push notification to all of a user's devices.
 * Called internally by other API routes (like, comment, message, etc.)
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, title, body: notifBody, url } = body as {
    userId?: string
    title?: string
    body?: string
    url?: string
  }

  if (!userId || !title) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no VAPID keys' })
  }

  // Get all subscriptions for the user
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const payload = JSON.stringify({
    title,
    body: notifBody || '',
    url: url || '/',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions as any[]) {
    try {
      const keys = JSON.parse(sub.keys)
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys,
        },
        payload
      )
      sent++
    } catch (e: any) {
      // If subscription is invalid (410), delete it
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await db.pushSubscription.deleteMany({ where: { id: sub.id } }).catch(() => {})
      }
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed })
}
