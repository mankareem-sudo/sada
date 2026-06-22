import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateAudioData, sanitizeText } from '@/lib/auth'
import { getTodayPrompt, ensureSeedPrompts } from '@/lib/prompts'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_DURATION = 90
const MIN_DURATION = 1

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    // Rate limit: 10 voice notes per hour per user
    const rateCheck = checkRateLimit(req, 'voiceNoteCreate', user.id)
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response
    }

    const body = await req.json()
    const {
      audioData,
      mimeType,
      durationSec,
      promptId,
      promptDate,
      description,
    } = body as {
      audioData?: string
      mimeType?: string
      durationSec?: number
      promptId?: string
      promptDate?: string
      description?: string
    }

    // Validate audio data
    const audioCheck = validateAudioData(audioData || '')
    if (!audioCheck.valid) {
      return NextResponse.json(
        { error: audioCheck.reason || 'تسجيل صوتي غير صالح' },
        { status: 400 }
      )
    }

    // Validate duration
    const dur = Math.floor(Number(durationSec) || 0)
    if (dur < MIN_DURATION || dur > MAX_DURATION) {
      return NextResponse.json(
        { error: `مدة التسجيل لازم تكون بين ${MIN_DURATION} و ${MAX_DURATION} ثانية` },
        { status: 400 }
      )
    }

    // Validate duration matches audio data size (basic sanity check)
    // At typical bitrates, 90s of audio is roughly 500KB-2MB
    const audioSizeBytes = Math.ceil((audioData!.split(',')[1] || '').length * 3 / 4)
    if (dur > 5 && audioSizeBytes < dur * 1000) {
      // Suspicious: duration claims to be > 5s but file is too small
      return NextResponse.json(
        { error: 'بيانات التسجيل غير متطابقة' },
        { status: 400 }
      )
    }

    // Sanitize description
    const cleanDescription = description ? sanitizeText(description, 280) : null

    await ensureSeedPrompts()

    let finalPromptId: string | null = null
    if (promptId) {
      finalPromptId = promptId
    } else if (promptDate) {
      const p = await db.prompt.findUnique({ where: { date: promptDate } })
      if (p) finalPromptId = p.id
    } else {
      const today = await getTodayPrompt()
      if (today) finalPromptId = today.id
    }

    const note = await db.voiceNote.create({
      data: {
        promptId: finalPromptId,
        userId: user.id,
        audioData,
        mimeType: mimeType || 'audio/webm',
        durationSec: dur,
        description: cleanDescription,
      },
    })

    // Send notifications to followers (limit to first 100 to avoid spam)
    const followers = await db.follow.findMany({
      where: { followeeId: user.id },
      select: { followerId: true },
      take: 100,
    })
    if (followers.length > 0) {
      await db.notification.createMany({
        data: followers.map((f) => ({
          recipientId: f.followerId,
          actorId: user.id,
          type: 'voice_note',
          voiceNoteId: note.id,
          text: `نشر ${user.name} صدى جديد`,
          read: false,
        })),
      })
    }

    return NextResponse.json({
      id: note.id,
      createdAt: note.createdAt,
    })
  } catch (e) {
    console.error('voice-note create error', e)
    return NextResponse.json(
      { error: 'فشل حفظ التسجيل' },
      { status: 500 }
    )
  }
}
