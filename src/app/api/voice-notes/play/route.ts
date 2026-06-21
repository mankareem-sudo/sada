import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/voice-notes/play
 * body: { id: string }
 * Increments play counter (idempotent for the same user/session is fine here)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body as { id?: string }
    if (!id) {
      return NextResponse.json({ error: 'missing id' }, { status: 400 })
    }
    await db.voiceNote.update({
      where: { id },
      data: { plays: { increment: 1 } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
