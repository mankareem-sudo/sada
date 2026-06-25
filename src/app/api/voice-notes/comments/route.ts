import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/voice-notes/comments?voiceNoteId=xxx
 * Returns comments for a voice note, including their replies (one level deep).
 * Now includes like counts + likedByMe for each comment.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const voiceNoteId = url.searchParams.get('voiceNoteId')
  if (!voiceNoteId) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  const currentUser = await getCurrentUser()

  // Fetch top-level comments (parentId is null) — Supabase-compatible
  const comments = await db.comment.findMany({
    where: { voiceNoteId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  if (comments.length === 0) {
    return NextResponse.json({ comments: [] })
  }

  // Fetch replies for all top-level comments
  const commentIds = (comments as any[]).map((c: any) => c.id)
  const replies = await db.comment.findMany({
    where: { parentId: { in: commentIds } },
    orderBy: { createdAt: 'asc' },
  })

  // Fetch all user info for comments + replies
  const allComments = [...(comments as any[]), ...(replies as any[])]
  const userIds = [...new Set(allComments.map((c: any) => c.userId))]
  const users = userIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
          avatarUrl: true,
          isVerified: true,
        },
      })
    : []
  const userMap = new Map((users as any[]).map((u: any) => [u.id, u]))

  // Fetch all comment likes for these comments
  const allCommentIds = allComments.map((c: any) => c.id)
  const allLikes = await db.commentLike.findMany({
    where: { commentId: { in: allCommentIds } },
    select: { commentId: true, userId: true },
  })
  const likeCounts: Record<string, number> = {}
  const myLikedCommentIds = new Set<string>()
  for (const l of allLikes as any[]) {
    likeCounts[l.commentId] = (likeCounts[l.commentId] || 0) + 1
    if (currentUser && l.userId === currentUser.id) {
      myLikedCommentIds.add(l.commentId)
    }
  }

  // Group replies by parentId
  const repliesByParent = new Map<string, any[]>()
  for (const r of replies as any[]) {
    const parent = r.parentId
    if (!repliesByParent.has(parent)) {
      repliesByParent.set(parent, [])
    }
    repliesByParent.get(parent)!.push({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      parentId: r.parentId,
      user: userMap.get(r.userId) || null,
      likesCount: likeCounts[r.id] || 0,
      likedByMe: myLikedCommentIds.has(r.id),
    })
  }

  return NextResponse.json({
    comments: (comments as any[]).map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      parentId: c.parentId,
      user: userMap.get(c.userId) || null,
      likesCount: likeCounts[c.id] || 0,
      likedByMe: myLikedCommentIds.has(c.id),
      replies: repliesByParent.get(c.id) || [],
    })),
  })
}

/**
 * POST /api/voice-notes/comments
 * body: { voiceNoteId, content, parentId? }
 * If parentId is provided, this is a reply to another comment.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  // Rate limit: 30 comments per hour per user
  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }

  const body = await req.json()
  const { voiceNoteId, content, parentId } = body as {
    voiceNoteId?: string
    content?: string
    parentId?: string
  }

  if (!voiceNoteId || !content || !content.trim()) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  // Sanitize content
  const trimmed = sanitizeText(content, 500)
  if (trimmed.length < 1) {
    return NextResponse.json({ error: 'التعليق قصير جداً' }, { status: 400 })
  }
  
  // Check for XSS attempts
  if (detectXSS(trimmed)) {
    return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({
    where: { id: voiceNoteId },
    select: { id: true, userId: true },
  })
  if (!note) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Validate parent comment if provided
  let parentOwnerId: string | null = null
  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { id: true, userId: true, voiceNoteId: true },
    })
    if (!parent || parent.voiceNoteId !== voiceNoteId) {
      return NextResponse.json({ error: 'تعليق أصلي غير صالح' }, { status: 400 })
    }
    parentOwnerId = parent.userId
  }

  const comment = await db.comment.create({
    data: {
      id: undefined, // let DB generate
      userId: user.id,
      voiceNoteId,
      content: trimmed,
      parentId: parentId || null,
    },
  })

  // Fetch user info for the comment
  const commentUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      name: true,
      avatarColor: true,
      avatarUrl: true,
      isVerified: true,
    },
  })

  // Notify note owner (if not replying to own note) AND parent comment owner (if reply and not own comment)
  const notifTargets = new Set<string>()
  if (note.userId !== user.id && !parentId) {
    notifTargets.add(note.userId)
  }
  if (parentId && parentOwnerId && parentOwnerId !== user.id) {
    notifTargets.add(parentOwnerId)
  }

  if (notifTargets.size > 0) {
    for (const recipientId of Array.from(notifTargets)) {
      await db.notification.create({
        data: {
          id: undefined,
          recipientId,
          actorId: user.id,
          type: 'comment',
          voiceNoteId,
          commentId: comment.id,
          text: parentId
            ? `ردّ ${user.name} على تعليقك`
            : `علّق ${user.name} على صداك`,
          read: false,
          createdAt: new Date().toISOString(),
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      user: commentUser,
      likesCount: 0,
      likedByMe: false,
      replies: [],
    },
  })
}

/**
 * DELETE /api/voice-notes/comments?id=xxx
 * Only the comment author can delete. Also deletes child replies.
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }
  const c = await db.comment.findUnique({ where: { id } })
  if (!c || c.userId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }
  await db.comment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
