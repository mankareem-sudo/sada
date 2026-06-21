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
 * GET /api/bookmarks
 * Returns the current user's saved voice notes.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      voiceNote: {
        include: {
          user: true,
          prompt: true,
          likes: { where: { userId: user.id }, select: { id: true } },
          bookmarks: { where: { userId: user.id }, select: { id: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  })

  return NextResponse.json({
    notes: bookmarks
      .filter((b) => b.voiceNote)
      .map((b) => safeNote(b.voiceNote, user.id)),
  })
}
