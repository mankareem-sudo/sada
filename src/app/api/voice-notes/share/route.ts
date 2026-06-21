import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/voice-notes/share
 * body: { id: string }
 * Returns a public share URL for the voice note.
 * (We don't have a separate public route yet — share just returns the URL with hash.)
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

  const note = await db.voiceNote.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: { username: true, name: true } },
    },
  })
  if (!note) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Build share URL pointing to home with hash
  // The frontend reads the hash and opens a share modal
  const url = `/?share=${id}`

  return NextResponse.json({
    url,
    id: note.id,
    text: `اسمع صوت ${note.user?.name || ''} على صدى`,
  })
}
