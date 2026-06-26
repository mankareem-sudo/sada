import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, validateAudioData, sanitizeText } from '@/lib/auth'

/**
 * POST /api/voice-drafts/save
 * body: { audioData, mimeType, durationSec, description?, promptId? }
 *
 * Saves a voice note as a draft (not published).
 * Max 10 drafts per user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { audioData, mimeType, durationSec, description, promptId } = body as {
      audioData?: string
      mimeType?: string
      durationSec?: number
      description?: string
      promptId?: string
    }

    if (!audioData) {
      return NextResponse.json({ error: 'مفيش تسجيل' }, { status: 400 })
    }

    const audioCheck = validateAudioData(audioData)
    if (!audioCheck.valid) {
      return NextResponse.json({ error: audioCheck.reason }, { status: 400 })
    }

    // Check max 10 drafts
    const existingDrafts = await db.voiceDraft.findMany({
      where: { userId: user.id },
    })
    if ((existingDrafts as any[]).length >= 10) {
      return NextResponse.json(
        { error: 'تقدر تحفظ 10 مسودات فقط — احذف وحدة الأول' },
        { status: 400 }
      )
    }

    const draft = await db.voiceDraft.create({
      data: {
        id: generateId(),
        userId: user.id,
        audioData,
        mimeType: mimeType || 'audio/webm',
        durationSec: Math.min(Math.floor(durationSec || 0), 90),
        description: description ? sanitizeText(description, 280) : null,
        promptId: promptId || null,
        createdAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ draft })
  } catch (e) {
    console.error('Voice draft save error', e)
    return NextResponse.json({ error: 'فشل حفظ المسودة' }, { status: 500 })
  }
}

/**
 * GET /api/voice-drafts/save
 * Returns all drafts for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const drafts = await db.voiceDraft.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      drafts: (drafts as any[]).map((d: any) => ({
        id: d.id,
        audioData: d.audioData,
        mimeType: d.mimeType,
        durationSec: d.durationSec,
        description: d.description,
        promptId: d.promptId,
        createdAt: d.createdAt,
      })),
    })
  } catch (e) {
    console.error('Voice drafts fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل المسودات' }, { status: 500 })
  }
}
