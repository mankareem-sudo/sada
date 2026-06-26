import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/stories/create
 * body: { audioData, durationSec, transcript?, backgroundColor? }
 *
 * Creates a new voice story that auto-expires after 24 hours.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { audioData, durationSec, transcript, backgroundColor } = body as {
      audioData?: string
      durationSec?: number
      transcript?: string
      backgroundColor?: string
    }

    if (!audioData) {
      return NextResponse.json({ error: 'مفيش تسجيل صوتي' }, { status: 400 })
    }

    if (durationSec && durationSec > 90) {
      return NextResponse.json({ error: 'الحد الأقصى 90 ثانية' }, { status: 400 })
    }

    // Check user hasn't posted more than 5 stories in last 24h (rate limit)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentStories = await db.voiceStory.findMany({
      where: {
        userId: user.id,
        createdAt: { gt: oneDayAgo },
      },
    })

    if (recentStories.length >= 5) {
      return NextResponse.json(
        { error: 'وصلت للحد الأقصى: 5 ستوريز في 24 ساعة' },
        { status: 429 }
      )
    }

    const STORY_COLORS = ['#1763CC', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#3B82F6', '#14b8a6']

    const story = await db.voiceStory.create({
      data: {
        id: generateId(),
        userId: user.id,
        audioData,
        durationSec: Math.min(durationSec || 0, 90),
        transcript: transcript || null,
        backgroundColor: backgroundColor || STORY_COLORS[Math.floor(Math.random() * STORY_COLORS.length)],
        viewsCount: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false,
        createdAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ story })
  } catch (e) {
    console.error('Story create error', e)
    return NextResponse.json({ error: 'فشل إنشاء الستوري' }, { status: 500 })
  }
}
