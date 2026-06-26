import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/stories/view
 * body: { storyId }
 *
 * Marks a story as viewed by the current user.
 * - Records a unique view (prevents double-counting)
 * - Increments story.viewsCount
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { storyId } = body as { storyId?: string }

    if (!storyId) {
      return NextResponse.json({ error: 'missing storyId' }, { status: 400 })
    }

    // Check story exists and is not expired
    const story = await db.voiceStory.findUnique({ where: { id: storyId } })
    if (!story) {
      return NextResponse.json({ error: 'الستوري مش موجودة' }, { status: 404 })
    }

    if (story.isExpired || new Date(story.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'الستوري منتهية' }, { status: 410 })
    }

    // Check if already viewed (avoid duplicates via UNIQUE constraint)
    const existing = await db.voiceStoryView.findFirst({
      where: { storyId, userId: user.id },
    })

    if (!existing) {
      // Record the view
      await db.voiceStoryView.create({
        data: {
          id: generateId(),
          storyId,
          userId: user.id,
          createdAt: new Date().toISOString(),
        },
      })

      // Increment viewsCount atomically
      await db.voiceStory.update({
        where: { id: storyId },
        data: { viewsCount: (story.viewsCount || 0) + 1 },
      })
    }

    return NextResponse.json({ ok: true, alreadyViewed: !!existing })
  } catch (e) {
    console.error('Story view error', e)
    return NextResponse.json({ error: 'فشل تسجيل المشاهدة' }, { status: 500 })
  }
}
