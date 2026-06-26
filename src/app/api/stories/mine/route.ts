import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/stories/mine
 *
 * Returns the current user's active stories (for the stories bar).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const now = new Date().toISOString()
    const stories = await db.voiceStory.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: now },
        isExpired: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ stories })
  } catch (e) {
    console.error('My stories error', e)
    return NextResponse.json({ error: 'فشل تحميل ستوريزك' }, { status: 500 })
  }
}
