import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function safeNote(n: any, currentUserId?: string) {
  return {
    id: n.id,
    durationSec: n.durationSec,
    mimeType: n.mimeType,
    audioData: n.audioData,
    description: n.description,
    transcript: n.transcript,
    plays: n.plays,
    createdAt: n.createdAt,
    prompt: n.prompt
      ? { id: n.prompt.id, text: n.prompt.text, date: n.prompt.date }
      : null,
    user: {
      id: n.user.id,
      username: n.user.username,
      name: n.user.name,
      avatarColor: n.user.avatarColor,
    },
    likedByMe: currentUserId
      ? n.likes?.some((l: any) => l.userId === currentUserId) ?? false
      : false,
    bookmarkedByMe: currentUserId
      ? n.bookmarks?.some((b: any) => b.userId === currentUserId) ?? false
      : false,
    likesCount: n._count?.likes ?? 0,
    commentsCount: n._count?.comments ?? 0,
  }
}

/**
 * GET /api/voice-notes/trending
 * Returns top voice notes from the last 7 days, ranked by:
 * plays + (likes * 2) + comments
 */
export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const user = await getCurrentUser()

  const notes = await db.voiceNote.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    include: {
      user: true,
      prompt: true,
      likes: user
        ? { where: { userId: user.id }, select: { id: true } }
        : false,
      bookmarks: user
        ? { where: { userId: user.id }, select: { id: true } }
        : false,
      _count: { select: { likes: true, comments: true } },
    },
    take: 200, // get a batch, then sort in-memory
  })

  // Compute trending score: plays + (likesCount * 2) + (commentsCount * 3)
  const scored = notes
    .map((n: any) => ({
      note: n,
      score:
        (n.plays || 0) +
        ((n._count?.likes || 0) * 2) +
        ((n._count?.comments || 0) * 3),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  return NextResponse.json({
    notes: scored.map(({ note }) => safeNote(note, user?.id)),
  })
}
