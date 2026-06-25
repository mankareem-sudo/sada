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
    privacy: p.privacy || 'public',
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
 * GET /api/posts/feed?limit=20&cursor=xxx&scope=all|following
 * Returns posts from everyone (discover) or just followed users.
 * Privacy rules:
 * - 'public': anyone can see
 * - 'friends': only friends of the post owner can see
 * - 'private': only the post owner can see
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)
  const cursor = url.searchParams.get('cursor')
  const scope = url.searchParams.get('scope') || 'all' // 'all' or 'following'

  let targetUserIds: string[] | undefined
  let followingIdsSet = new Set<string>()
  if (user) {
    // Always fetch following for ranking
    const follows = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followeeId: true },
    })
    followingIdsSet = new Set((follows as any[]).map((f: any) => f.followeeId))
    if (scope === 'following') {
      targetUserIds = [user.id, ...Array.from(followingIdsSet)]
    }
  }

  // Build privacy-aware where clause
  // - Owner can see all their own posts (any privacy)
  // - Friends can see public + friends-only posts from others
  // - Non-friends can only see public posts
  let privacyWhere: any
  let friendIdsSet = new Set<string>()

  if (user) {
    // Get user's friends list — query both directions (Supabase doesn't support OR well)
    const friendsAsRequester = await db.friendship.findMany({
      where: { requesterId: user.id, status: 'accepted' },
      select: { addresseeId: true },
    })
    const friendsAsAddressee = await db.friendship.findMany({
      where: { addresseeId: user.id, status: 'accepted' },
      select: { requesterId: true },
    })
    friendIdsSet = new Set([
      ...(friendsAsRequester as any[]).map((f: any) => f.addresseeId),
      ...(friendsAsAddressee as any[]).map((f: any) => f.requesterId),
    ])

    privacyWhere = {
      OR: [
        // User's own posts (any privacy)
        { userId: user.id },
        // Public posts from others
        { privacy: 'public', userId: { ne: user.id } },
        // Friends-only posts from friends
        { privacy: 'friends', userId: { in: Array.from(friendIdsSet) } },
      ],
    }
  } else {
    // Anonymous users can only see public posts
    privacyWhere = { privacy: 'public' }
  }

  // Combine with scope filter
  const finalWhere = targetUserIds
    ? { AND: [{ userId: { in: targetUserIds } }, privacyWhere] }
    : privacyWhere

  // Fetch posts
  const posts = await db.post.findMany({
    where: finalWhere,
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

  // === Smart Feed Ranking (6-criteria algorithm from strategy doc) ===
  // 1. Relevance (1): Is the post author followed by the user? (highest weight)
  // 2. Interaction depth (2): Total likes + comments (engagement)
  // 3. Acoustic quality (3): N/A for text posts — voice notes get slight boost
  // 4. Recency (4): Newer posts score higher
  // 5. Badges (5): Verified users get a small boost
  // 6. Non-spam (6): Posts with extreme repetition or patterns get demoted
  const now = Date.now()
  const rankedPosts = enrichedPosts.map((p: any) => {
    let score = 0

    // 1. Relevance — author is followed by current user
    if (user && followingIdsSet.has(p.userId)) {
      score += 40
    }
    // Author is a friend — even higher boost
    if (user && friendIdsSet.has(p.userId)) {
      score += 30
    }

    // 2. Interaction depth — likes + comments (logarithmic to prevent viral dominance)
    const engagement = (p._count.likes || 0) + (p._count.comments || 0) * 2
    score += Math.min(Math.log10(engagement + 1) * 15, 30)

    // 3. Acoustic quality — voice posts get a small boost
    if (p.type === 'voice' || p.voiceNoteId) {
      score += 10
    }

    // 4. Recency — posts lose ~1 point per hour, max -20 after 20h
    const ageHours = (now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60)
    score -= Math.min(ageHours, 20)

    // 5. Badges — verified authors get +5
    if (p.user?.isVerified) {
      score += 5
    }

    // 6. Non-spam — demote posts with excessive repetition
    const content = p.content || ''
    if (content) {
      // Check for excessive character repetition
      const hasRepetition = /(.)\1{5,}/.test(content)
      if (hasRepetition) score -= 10
      // Check for excessive caps
      const capsRatio = (content.match(/[A-Z\u0600-\u06FF]/g) || []).length / content.length
      if (capsRatio > 0.7 && content.length > 30) score -= 5
    }

    return { ...p, _rankScore: score }
  })

  // Sort by rank score (desc), then by recency as tiebreaker
  rankedPosts.sort((a: any, b: any) => {
    if (b._rankScore !== a._rankScore) return b._rankScore - a._rankScore
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Remove the _rankScore from the final output
  const finalPosts = rankedPosts.map(({ _rankScore, ...p }: any) => p)

  const hasMore = finalPosts.length > limit
  const slice = hasMore ? finalPosts.slice(0, limit) : finalPosts
  const nextCursor = hasMore ? slice[slice.length - 1]?.id : null

  return NextResponse.json({
    posts: slice.map((p) => safePost(p, user?.id)),
    nextCursor,
  })
}
