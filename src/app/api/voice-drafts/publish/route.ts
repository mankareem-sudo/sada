import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/voice-drafts/publish
 * body: { draftId, promptId?, promptDate?, description? }
 *
 * Publishes a draft as a voice note, then deletes the draft.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { draftId, promptId, promptDate, description } = body as {
      draftId?: string
      promptId?: string
      promptDate?: string
      description?: string
    }

    if (!draftId) {
      return NextResponse.json({ error: 'missing draftId' }, { status: 400 })
    }

    // Get the draft
    const draft = await db.voiceDraft.findUnique({ where: { id: draftId } })
    if (!draft) {
      return NextResponse.json({ error: 'المسودة مش موجودة' }, { status: 404 })
    }

    if (draft.userId !== user.id) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
    }

    // Create the voice note from the draft
    const note = await db.voiceNote.create({
      data: {
        id: generateId(),
        userId: user.id,
        audioData: draft.audioData,
        mimeType: draft.mimeType,
        durationSec: draft.durationSec,
        description: description || draft.description || null,
        promptId: promptId || draft.promptId || null,
        createdAt: new Date().toISOString(),
      },
    })

    // Delete the draft
    await db.voiceDraft.delete({ where: { id: draftId } })

    return NextResponse.json({
      id: note.id,
      createdAt: note.createdAt,
      published: true,
    })
  } catch (e) {
    console.error('Voice draft publish error', e)
    return NextResponse.json({ error: 'فشل نشر المسودة' }, { status: 500 })
  }
}
