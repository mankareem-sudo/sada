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
      avatarUrl: n.user.avatarUrl,
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

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)
  const cursorParam = url.searchParams.get('cursor')

  const followingIds = await db.follow.findMany({
    where: { followerId: user.id },
    select: { followeeId: true },
  })
  const targetUserIds = [user.id, ...followingIds.map((f) => f.followeeId)]

  const notes = await db.voiceNote.findMany({
    where: { userId: { in: targetUserIds } },
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
      likes: { where: { userId: user.id }, select: { id: true } },
      bookmarks: { where: { userId: user.id }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  })

  const hasMore = notes.length > limit
  const slice = hasMore ? notes.slice(0, limit) : notes
  const nextCursor = hasMore ? slice[slice.length - 1]?.id : null

  return NextResponse.json({
    notes: slice.map((n) => safeNote(n, user.id)),
    nextCursor,
  })
}
