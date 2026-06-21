import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/search?q=xxx
 * Searches users (by username/name) and voice notes (by description).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (q.length < 1) {
    return NextResponse.json({ users: [], voiceNotes: [] })
  }

  // SQLite LIKE is case-insensitive for ASCII only.
  // For Arabic we need to scan + filter, but small DB so fine.
  const [users, voiceNotes] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { name: { contains: q } },
        ],
      },
      take: 20,
      select: {
        id: true,
        username: true,
        name: true,
        avatarColor: true,
        bio: true,
      },
    }),
    db.voiceNote.findMany({
      where: {
        description: { contains: q },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarColor: true,
          },
        },
        prompt: true,
      },
    }),
  ])

  return NextResponse.json({
    users,
    voiceNotes: voiceNotes.map((n) => ({
      id: n.id,
      durationSec: n.durationSec,
      mimeType: n.mimeType,
      audioData: n.audioData,
      description: n.description,
      plays: n.plays,
      createdAt: n.createdAt,
      user: n.user,
      prompt: n.prompt
        ? { id: n.prompt.id, text: n.prompt.text, date: n.prompt.date }
        : null,
    })),
  })
}
