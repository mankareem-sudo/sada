import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS, validateAudioData } from '@/lib/auth'
import { moderateText } from '@/lib/moderation'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/posts/comments?postId=xxx
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const postId = url.searchParams.get('postId')
  if (!postId) return NextResponse.json({ error: 'missing postId' }, { status: 400 })

  const comments = await db.postComment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  // Get users
  const userIds = [...new Set(comments.map((c: any) => c.userId))]
  const users = userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  // Get replies
  const commentIds = comments.map((c: any) => c.id)
  let replies: any[] = []
  if (commentIds.length > 0) {
    replies = await db.postComment.findMany({
      where: { parentId: { in: commentIds } },
      orderBy: { createdAt: 'asc' },
    })
    const replyUserIds = [...new Set(replies.map((r: any) => r.userId))]
    if (replyUserIds.length > 0) {
      const replyUsers = await db.user.findMany({ where: { id: { in: replyUserIds } } })
      replyUsers.forEach((u: any) => userMap.set(u.id, u))
    }
  }

  const replyMap: Record<string, any[]> = {}
  for (const r of replies) {
    const pId = (r as any).parentId
    if (!replyMap[pId]) replyMap[pId] = []
    replyMap[pId].push({ ...r, user: userMap.get((r as any).userId) })
  }

  return NextResponse.json({
    comments: comments.map((c: any) => ({
      id: c.id,
      content: c.content,
      imageUrl: c.imageUrl,
      voiceData: c.voiceData,
      voiceDuration: c.voiceDuration,
      createdAt: c.createdAt,
      parentId: c.parentId,
      user: userMap.get(c.userId),
      replies: replyMap[c.id] || [],
    })),
  })
}

/**
 * POST /api/posts/comments
 * body: { postId, content?, imageUrl?, voiceData?, voiceDuration?, parentId? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { postId, content, imageUrl, voiceData, voiceDuration, parentId } = body as {
    postId?: string
    content?: string
    imageUrl?: string
    voiceData?: string
    voiceDuration?: number
    parentId?: string
  }

  if (!postId) return NextResponse.json({ error: 'missing postId' }, { status: 400 })

  // Need at least one type of content
  if (!content && !imageUrl && !voiceData) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  const data: any = {
    id: generateId(),
    userId: user.id,
    postId,
    createdAt: new Date().toISOString(),
  }

  if (content) {
    const clean = sanitizeText(content, 500)
    if (detectXSS(clean)) return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })

    // AI Moderation
    const moderation = moderateText(clean)
    if (moderation.action === 'block') {
      return NextResponse.json(
        {
          error: 'تعليقك مخالف لسياسة المنصة',
          reasons: moderation.reasons,
        },
        { status: 422 }
      )
    }

    data.content = clean
  }

  if (imageUrl) {
    const match = imageUrl.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!match) return NextResponse.json({ error: 'صيغة صورة غير صحيحة' }, { status: 400 })
    if (imageUrl.length > 2 * 1024 * 1024) return NextResponse.json({ error: 'صورة كبيرة' }, { status: 400 })
    data.imageUrl = imageUrl
  }

  if (voiceData) {
    const audioCheck = validateAudioData(voiceData)
    if (!audioCheck.valid) return NextResponse.json({ error: audioCheck.reason }, { status: 400 })
    data.voiceData = voiceData
    data.voiceDuration = voiceDuration || 0
  }

  if (parentId) data.parentId = parentId

  const comment = await db.postComment.create({ data })

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    imageUrl: comment.imageUrl,
    voiceData: comment.voiceData,
    voiceDuration: comment.voiceDuration,
    createdAt: comment.createdAt,
    user: { id: user.id, name: user.name, username: user.username, avatarColor: user.avatarColor, avatarUrl: user.avatarUrl },
  })
}

/**
 * DELETE /api/posts/comments?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  await db.postComment.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
