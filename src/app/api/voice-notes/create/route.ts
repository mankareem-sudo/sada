import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getTodayPrompt, ensureSeedPrompts } from '@/lib/prompts'

const MAX_DURATION = 90
const MIN_DURATION = 1

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
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

    if (!audioData || !audioData.startsWith('data:audio')) {
      return NextResponse.json(
        { error: 'تسجيل صوتي غير صالح' },
        { status: 400 }
      )
    }

    const dur = Math.floor(Number(durationSec) || 0)
    if (dur < MIN_DURATION || dur > MAX_DURATION) {
      return NextResponse.json(
        { error: `مدة التسجيل لازم تكون بين ${MIN_DURATION} و ${MAX_DURATION} ثانية` },
        { status: 400 }
      )
    }

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

    if (audioData.length > 7_000_000) {
      return NextResponse.json(
        { error: 'حجم التسجيل كبير جداً، حاول مرة تانية' },
        { status: 400 }
      )
    }

    const note = await db.voiceNote.create({
      data: {
        promptId: finalPromptId,
        userId: user.id,
        audioData,
        mimeType: mimeType || 'audio/webm',
        durationSec: dur,
        description:
          typeof description === 'string' && description.trim()
            ? description.trim().slice(0, 280)
            : null,
      },
    })

    // Send notifications to followers
    const followers = await db.follow.findMany({
      where: { followeeId: user.id },
      select: { followerId: true },
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
