import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/voice-notes/bookmark
 * body: { id: string, action: 'save' | 'unsave' }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { id, action } = body as { id?: string; action?: 'save' | 'unsave' }
  if (!id || !action) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({ where: { id }, select: { id: true } })
  if (!note) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  if (action === 'save') {
    try {
      await db.bookmark.create({
        data: { userId: user.id, voiceNoteId: id },
      })
    } catch {
      // already saved
    }
  } else {
    await db.bookmark.deleteMany({
      where: { userId: user.id, voiceNoteId: id },
    })
  }

  return NextResponse.json({ saved: action === 'save' })
}
