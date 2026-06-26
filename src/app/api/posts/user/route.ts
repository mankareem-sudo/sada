import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/posts/user?userId=xxx&limit=50
 * Returns posts by a specific user, respecting privacy.
 * - Public posts: anyone can see
 * - Friends-only posts: only friends can see
 * - Private posts: only the owner can see
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100)

  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

  const currentUser = await getCurrentUser()
  const isMe = currentUser?.id === userId

  let where: any = { userId }

  if (!isMe) {
    // Check if friends
    let isFriend = false
    if (currentUser) {
      const friendship = await db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: currentUser.id, addresseeId: userId, status: 'accepted' },
            { requesterId: userId, addresseeId: currentUser.id, status: 'accepted' },
          ],
        },
      })
      isFriend = !!friendship
    }

    if (isFriend) {
      // Friends can see public + friends-only
      where = { userId, privacy: { in: ['public', 'friends'] } }
    } else {
      // Non-friends can only see public
      where = { userId, privacy: 'public' }
    }
  }

  const posts = await db.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Get user info
  const targetUser = await db.user.findUnique({ where: { id: userId } })
  
  // Get likes info
  const postIds = posts.map((p: any) => p.id)
  let likeCounts: Record<string, number> = {}
  let myLikes: any[] = []
  let commentCounts: Record<string, number> = {}

  if (postIds.length > 0) {
    const allLikes = await db.postLike.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true },
    })
    for (const l of allLikes as any[]) {
      likeCounts[l.postId] = (likeCounts[l.postId] || 0) + 1
    }

    if (currentUser) {
      myLikes = await db.postLike.findMany({
        where: { postId: { in: postIds }, userId: currentUser.id },
      })
    }

    const allComments = await db.postComment.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true },
    })
    for (const c of allComments as any[]) {
      commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1
    }
  }

  const myLikeSet = new Set(myLikes.map((l: any) => l.postId))

  return NextResponse.json({
    posts: posts.map((p: any) => ({
      id: p.id,
      type: p.type,
      content: p.content,
      imageUrl: p.imageUrl,
      voiceNoteId: p.voiceNoteId,
      privacy: p.privacy || 'public',
      plays: p.plays,
      createdAt: p.createdAt,
      user: targetUser ? {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        avatarColor: targetUser.avatarColor,
        avatarUrl: targetUser.avatarUrl,
      } : null,
      likedByMe: myLikeSet.has(p.id),
      likesCount: likeCounts[p.id] || 0,
      commentsCount: commentCounts[p.id] || 0,
    })),
  })
}
