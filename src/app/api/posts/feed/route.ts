import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function safePost(p: any, currentUserId?: string) {
  return {
    id: p.id,
    type: p.type,
    content: p.content,
    imageUrl: p.imageUrl,
    voiceNoteId: p.voiceNoteId,
    plays: p.plays,
    createdAt: p.createdAt,
    user: p.user ? {
      id: p.user.id,
      username: p.user.username,
      name: p.user.name,
      avatarColor: p.user.avatarColor,
      avatarUrl: p.user.avatarUrl,
    } : null,
    likedByMe: currentUserId
      ? (p.likes || []).some((l: any) => l.userId === currentUserId)
      : false,
    likesCount: p._count?.likes ?? (p.likes?.length ?? 0),
    commentsCount: p._count?.comments ?? 0,
  }
}

/**
 * GET /api/posts/feed?limit=20&cursor=xxx
 * Returns posts from everyone (discover) or just followed users.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)
  const cursor = url.searchParams.get('cursor')
  const scope = url.searchParams.get('scope') || 'all' // 'all' or 'following'

  let targetUserIds: string[] | undefined
  if (scope === 'following' && user) {
    const follows = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followeeId: true },
    })
    targetUserIds = [user.id, ...follows.map((f: any) => f.followeeId)]
  }

  // Fetch posts
  const posts = await db.post.findMany({
    where: targetUserIds ? { userId: { in: targetUserIds } } : {},
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  // Get user info for each post
  const userIds = [...new Set(posts.map((p: any) => p.userId))]
  const users = userIds.length > 0
    ? await db.user.findMany({ where: { id: { in: userIds } } })
    : []
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  // Get likes for current user
  const postIds = posts.map((p: any) => p.id)
  let myLikes: any[] = []
  let likeCounts: Record<string, number> = {}
  let commentCounts: Record<string, number> = {}

  if (postIds.length > 0) {
    if (user) {
      myLikes = await db.postLike.findMany({
        where: { postId: { in: postIds }, userId: user.id },
      })
    }
    // Get all likes for count
    const allLikes = await db.postLike.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true },
    })
    for (const l of allLikes as any[]) {
      likeCounts[l.postId] = (likeCounts[l.postId] || 0) + 1
    }
    // Get comment counts
    const allComments = await db.postComment.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true },
    })
    for (const c of allComments as any[]) {
      commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1
    }
  }

  const myLikeSet = new Set(myLikes.map((l: any) => l.postId))

  const enrichedPosts = posts.map((p: any) => ({
    ...p,
    user: userMap.get(p.userId),
    likes: myLikeSet.has(p.id) ? [{ userId: user?.id }] : [],
    _count: {
      likes: likeCounts[p.id] || 0,
      comments: commentCounts[p.id] || 0,
    },
  }))

  const hasMore = enrichedPosts.length > limit
  const slice = hasMore ? enrichedPosts.slice(0, limit) : enrichedPosts
  const nextCursor = hasMore ? slice[slice.length - 1]?.id : null

  return NextResponse.json({
    posts: slice.map((p) => safePost(p, user?.id)),
    nextCursor,
  })
}
