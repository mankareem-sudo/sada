import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function safeNote(n: any, currentUserId?: string) {
  return {
    id: n.id,
    durationSec: n.durationSec,
    mimeType: n.mimeType,
    audioData: n.audioData,
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
    likesCount: n._count?.likes ?? 0,
  }
}

/**
 * GET /api/voice-notes/discover
 * Public feed of latest voice notes. Optional ?promptId=... to filter.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 30), 80)
  const cursorParam = url.searchParams.get('cursor')
  const promptId = url.searchParams.get('promptId')

  const user = await getCurrentUser()

  const notes = await db.voiceNote.findMany({
    where: promptId ? { promptId } : {},
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursorParam
      ? {
          skip: 1,
          cursor: { id: cursorParam },
        }
      : {}),
    include: {
      user: true,
      prompt: true,
      likes: user
        ? { where: { userId: user.id }, select: { id: true } }
        : false,
      _count: { select: { likes: true } },
    },
  })

  const hasMore = notes.length > limit
  const slice = hasMore ? notes.slice(0, limit) : notes
  const nextCursor = hasMore ? slice[slice.length - 1]?.id : null

  return NextResponse.json({
    notes: slice.map((n) => safeNote(n, user?.id)),
    nextCursor,
  })
}
