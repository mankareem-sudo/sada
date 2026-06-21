import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/voice-notes/transcribe
 * body: { id: string }
 * Uses z-ai-web-dev-sdk ASR to transcribe a voice note and store the transcript.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { id } = body as { id?: string }
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({ where: { id } })
  if (!note) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Only owner or admin can transcribe (cost control)
  if (note.userId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  // Already transcribed? Return cached
  if (note.transcript && note.transcript.trim().length > 0) {
    return NextResponse.json({ transcript: note.transcript, cached: true })
  }

  try {
    // Lazy import to avoid loading SDK if not needed
    const ZAIModule = await import('z-ai-web-dev-sdk')
    const ZAI = (ZAIModule as any).default || ZAIModule
    const zai = await ZAI.create()

    // Extract base64 from data URI
    // Format: data:audio/webm;codecs=opus;base64,XXXXX
    const dataUri = note.audioData
    const base64Match = dataUri.match(/^data:[^;]+;base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json({ error: 'صيغة الصوت غير صالحة' }, { status: 400 })
    }
    const base64 = base64Match[1]

    const response = await zai.audio.asr.create({
      file_base64: base64,
    })

    const transcript = (response?.text || '').trim()
    if (!transcript) {
      return NextResponse.json({ error: 'ما قدرناش نترجم الصوت' }, { status: 422 })
    }

    await db.voiceNote.update({
      where: { id },
      data: { transcript: transcript.slice(0, 2000) },
    })

    return NextResponse.json({ transcript, cached: false })
  } catch (e: any) {
    console.error('Transcribe error:', e?.message || e)
    return NextResponse.json(
      { error: 'فشلت الترجمة الصوتية. حاول مرة تانية.' },
      { status: 500 }
    )
  }
}
