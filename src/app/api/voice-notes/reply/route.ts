import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, validateAudioData, sanitizeText } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/voice-notes/reply
 * body: { parentVoiceNoteId, audioData, mimeType, durationSec, description? }
 * Creates a voice reply to another voice note (like TikTok duet)
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const rateCheck = checkRateLimit(req, 'voiceNoteCreate', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { parentVoiceNoteId, audioData, mimeType, durationSec, description } = body as {
    parentVoiceNoteId?: string
    audioData?: string
    mimeType?: string
    durationSec?: number
    description?: string
  }

  if (!parentVoiceNoteId) return NextResponse.json({ error: 'missing parentVoiceNoteId' }, { status: 400 })

  const audioCheck = validateAudioData(audioData || '')
  if (!audioCheck.valid) return NextResponse.json({ error: audioCheck.reason }, { status: 400 })

  const dur = Math.floor(Number(durationSec) || 0)
  if (dur < 1 || dur > 90) return NextResponse.json({ error: 'مدة غير صحيحة' }, { status: 400 })

  // Verify parent exists
  const parent = await db.voiceNote.findUnique({ where: { id: parentVoiceNoteId } })
  if (!parent) return NextResponse.json({ error: 'الصدى الأصلي غير موجود' }, { status: 404 })

  const note = await db.voiceNote.create({
    data: {
      id: generateId(),
      userId: user.id,
      audioData,
      mimeType: mimeType || 'audio/webm',
      durationSec: dur,
      description: description ? sanitizeText(description, 280) : null,
      replyToId: parentVoiceNoteId,
      createdAt: new Date().toISOString(),
    },
  })

  // Notify parent owner
  if (parent.userId !== user.id) {
    await db.notification.create({
      data: {
        id: generateId(),
        recipientId: parent.userId,
        actorId: user.id,
        type: 'comment',
        voiceNoteId: note.id,
        text: `ردّ ${user.name} على صداك بصوت`,
        read: false,
        createdAt: new Date().toISOString(),
      },
    }).catch(() => {})
  }

  return NextResponse.json({ id: note.id, createdAt: note.createdAt })
}
