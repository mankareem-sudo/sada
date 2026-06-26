import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS, validateAudioData } from '@/lib/auth'
import { moderateText } from '@/lib/moderation'
import { moderateWithAI, shouldAutoHide, shouldWarnUser } from '@/lib/ai-moderation'
import { checkRateLimit } from '@/lib/rate-limit'
import { checkUserStrikeStatus } from '@/lib/strike'

/**
 * GET /api/posts/comments?postId=xxx
 *
 * Returns comments with full nested reply tree (up to 5 levels).
 * Uses recursive fetching: get top-level → get their replies → get replies of replies.
 *
 * Returns comments with `replies` array (nested tree structure).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const postId = url.searchParams.get('postId')
  if (!postId) return NextResponse.json({ error: 'missing postId' }, { status: 400 })

  // Get top-level comments (depth=0, parentId=null)
  const topLevelComments = await db.postComment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
    take: 50, // Lazy load: first 50 comments
  })

  if ((topLevelComments as any[]).length === 0) {
    return NextResponse.json({ comments: [] })
  }

  // Collect all comment IDs for batch fetching
  const allCommentIds = [...(topLevelComments as any[]).map((c: any) => c.id)]
  const userMap = new Map<string, any>()

  // Fetch all replies (depth 1-5) in batches
  // This is more efficient than N+1 queries
  let currentLevelIds = [...allCommentIds]
  const allComments = [...(topLevelComments as any[])]

  for (let depth = 1; depth <= 5; depth++) {
    if (currentLevelIds.length === 0) break

    const replies = await db.postComment.findMany({
      where: { parentId: { in: currentLevelIds } },
      orderBy: { createdAt: 'asc' },
    })

    if ((replies as any[]).length === 0) break

    allComments.push(...(replies as any[]))
    currentLevelIds = (replies as any[]).map((r: any) => r.id)
  }

  // Fetch all users in one query
  const userIds = [...new Set(allComments.map((c: any) => c.userId))]
  if (userIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, avatarColor: true, avatarUrl: true, isVerified: true },
    })
    ;(users as any[]).forEach((u: any) => userMap.set(u.id, u))
  }

  // Fetch comment likes for current user
  const currentUser = await getCurrentUser()
  const commentIds = allComments.map((c: any) => c.id)
  let myCommentLikes = new Set<string>()
  let commentLikeCounts: Record<string, number> = {}

  if (commentIds.length > 0) {
    const allLikes = await db.commentLike.findMany({
      where: { commentId: { in: commentIds } },
      select: { commentId: true, userId: true },
    })
    for (const l of allLikes as any[]) {
      commentLikeCounts[l.commentId] = (commentLikeCounts[l.commentId] || 0) + 1
    }
    if (currentUser) {
      myCommentLikes = new Set((allLikes as any[]).filter((l: any) => l.userId === currentUser.id).map((l: any) => l.commentId))
    }
  }

  // Build nested tree
  const commentMap = new Map<string, any>()
  for (const c of allComments) {
    commentMap.set(c.id, {
      id: c.id,
      content: c.content,
      imageUrl: c.imageUrl,
      voiceData: c.voiceData,
      voiceDuration: c.voiceDuration,
      createdAt: c.createdAt,
      parentId: c.parentId,
      depth: c.depth || 0,
      isPinned: c.isPinned || false,
      isHidden: c.isHidden || false,
      editedAt: c.editedAt || null,
      user: userMap.get(c.userId),
      likesCount: commentLikeCounts[c.id] || 0,
      likedByMe: myCommentLikes.has(c.id),
      replies: [],
    })
  }

  // Build tree: attach replies to their parents
  for (const c of allComments) {
    if (c.parentId && commentMap.has(c.parentId)) {
      commentMap.get(c.parentId).replies.push(commentMap.get(c.id))
    }
  }

  // Return only top-level comments (with nested replies)
  const topLevelIds = new Set((topLevelComments as any[]).map((c: any) => c.id))
  let result = Array.from(commentMap.values()).filter((c: any) => topLevelIds.has(c.id))

  // Sort: pinned comments first, then by createdAt ascending
  result.sort((a: any, b: any) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Filter hidden comments for viewers (not post owner, not comment author, not admin)
  if (currentUser) {
    const post = await db.post.findUnique({ where: { id: postId }, select: { userId: true } }).catch(() => null)
    const postOwnerId = post?.userId
    result = result.filter((c: any) => {
      if (!c.isHidden) return true
      // Visible only if: post owner, comment author, or admin
      return currentUser.id === postOwnerId || currentUser.id === c.user?.id || currentUser.isAdmin
    }).map((c: any) => {
      // Also filter hidden replies inside the tree
      if (c.replies && c.replies.length > 0) {
        c.replies = c.replies.filter((r: any) => {
          if (!r.isHidden) return true
          return currentUser.id === postOwnerId || currentUser.id === r.user?.id || currentUser.isAdmin
        })
      }
      return c
    })
  } else {
    // Not logged in — hide all hidden comments
    result = result.filter((c: any) => !c.isHidden).map((c: any) => {
      if (c.replies && c.replies.length > 0) {
        c.replies = c.replies.filter((r: any) => !r.isHidden)
      }
      return c
    })
  }

  return NextResponse.json({ comments: result })
}

/**
 * POST /api/posts/comments
 * body: { postId, content?, imageUrl?, voiceData?, voiceDuration?, parentId? }
 *
 * Creates a comment or reply (nested up to 5 levels).
 * If parentId is provided, the new comment is a reply at depth = parent.depth + 1.
 * At max depth (5), replies flatten to the same level.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  // === Strike system check ===
  const strikeStatus = await checkUserStrikeStatus(user.id)
  if (strikeStatus.currentPenalty === 'ban' || strikeStatus.currentPenalty === 'mute') {
    const endsAt = strikeStatus.penaltyEndsAt
      ? new Date(strikeStatus.penaltyEndsAt).toLocaleString('ar-EG')
      : 'دائم'
    const action = strikeStatus.currentPenalty === 'ban' ? 'حظر' : 'كتم'
    return NextResponse.json({
      error: `تم ${action} حسابك حتى: ${endsAt}`,
      penalty: strikeStatus.currentPenalty,
      penaltyEndsAt: strikeStatus.penaltyEndsAt,
    }, { status: 403 })
  }

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
  if (!content && !imageUrl && !voiceData) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  const data: any = {
    id: generateId(),
    postId,
    userId: user.id,
    createdAt: new Date().toISOString(),
  }

  // Determine depth based on parent
  let depth = 0
  let replyToName: string | null = null

  if (parentId) {
    // Fetch parent comment to get its depth
    const parent = await db.postComment.findUnique({ where: { id: parentId } })
    if (parent) {
      // Max depth = 5. At max depth, flatten (stay at depth 5)
      depth = Math.min((parent.depth || 0) + 1, 5)
      replyToName = null // Could fetch parent user name for "@name" prefix

      // Get parent user's name for reply context
      const parentUser = await db.user.findUnique({
        where: { id: parent.userId },
        select: { name: true },
      })
      if (parentUser) {
        replyToName = parentUser.name
      }
    }
  }

  data.depth = depth
  data.parentId = parentId || null

  if (content) {
    const clean = sanitizeText(content, 500)
    if (detectXSS(clean)) return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })

    const aiResult = await moderateWithAI(clean)
    if (aiResult.action === 'block' || shouldAutoHide(aiResult)) {
      return NextResponse.json(
        { error: 'تعليقك مخالف لسياسة المنصة', reasons: aiResult.categories, explanation: aiResult.explanation },
        { status: 422 }
      )
    }

    data.content = clean

    if (shouldWarnUser(aiResult)) {
      await db.userWarning.create({
        data: {
          id: generateId(),
          userId: user.id,
          reason: `تحذير تلقائي على تعليق: ${aiResult.explanation}`,
          category: aiResult.categories[0] || 'policy_violation',
          contentType: 'comment',
          contentId: 'pending',
          severity: aiResult.severity,
          isAcknowledged: false,
          createdAt: new Date().toISOString(),
        },
      }).catch(() => {})
    }
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

  const comment = await db.postComment.create({ data })

  // Send notifications
  const post = await db.post.findUnique({ where: { id: postId } })
  if (post) {
    // Notify post owner (if not commenting on own post)
    if (post.userId !== user.id) {
      await db.notification.create({
        data: {
          id: generateId(),
          recipientId: post.userId,
          actorId: user.id,
          type: 'comment',
          text: `${user.name} علّق على منشورك`,
          read: false,
          createdAt: new Date().toISOString(),
        },
      }).catch(() => {})
    }

    // If reply, notify the parent comment author too
    if (parentId) {
      const parent = await db.postComment.findUnique({ where: { id: parentId } })
      if (parent && parent.userId !== user.id && parent.userId !== post.userId) {
        await db.notification.create({
          data: {
            id: generateId(),
            recipientId: parent.userId,
            actorId: user.id,
            type: 'comment',
            text: `${user.name} رد على تعليقك`,
            read: false,
            createdAt: new Date().toISOString(),
          },
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    imageUrl: comment.imageUrl,
    voiceData: comment.voiceData,
    voiceDuration: comment.voiceDuration,
    createdAt: comment.createdAt,
    parentId: comment.parentId,
    depth: comment.depth || 0,
    replyToName,
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

  const comment = await db.postComment.findUnique({ where: { id } })
  if (!comment) return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 })
  if (comment.userId !== user.id) return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })

  // Delete the comment and all its replies (cascade)
  // First, find all descendant comments
  const toDelete: string[] = [id]
  let currentIds = [id]

  for (let i = 0; i < 5; i++) {
    const children = await db.postComment.findMany({
      where: { parentId: { in: currentIds } },
      select: { id: true },
    })
    if ((children as any[]).length === 0) break
    currentIds = (children as any[]).map((c: any) => c.id)
    toDelete.push(...currentIds)
  }

  // Delete comment likes for all affected comments
  await db.commentLike.deleteMany({ where: { commentId: { in: toDelete } } }).catch(() => {})

  // Delete all comments
  for (const commentId of toDelete) {
    try {
      await db.postComment.delete({ where: { id: commentId } })
    } catch {}
  }

  return NextResponse.json({ ok: true, deleted: toDelete.length })
}
