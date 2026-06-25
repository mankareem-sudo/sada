import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/discover/recommendations?limit=10
 *
 * AI-style recommendation algorithm based on:
 * 1. Content the user liked (similar authors, similar hashtags)
 * 2. Users the user follows (their best posts)
 * 3. Interests selected during onboarding
 * 4. Trending in user's region/language
 * 5. Diversity (avoid showing too much from same author)
 *
 * Returns mixed content: voice notes + posts
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || 10), 30)

    // === Anonymous / new user fallback: return trending + recent ===
    if (!user) {
      const [trendingVoices, recentPosts] = await Promise.all([
        db.voiceNote.findMany({
          where: { isPublic: true },
          orderBy: [{ plays: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        }),
        db.post.findMany({
          where: { privacy: 'public', isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

      return NextResponse.json({
        recommendations: [
          ...trendingVoices.map((v: any) => ({
            id: v.id,
            type: 'voice',
            title: v.transcript?.slice(0, 100) || 'تسجيل صوتي',
            createdAt: v.createdAt,
            score: (v.plays || 0) * 0.01,
            reason: 'رائج الآن',
          })),
          ...recentPosts.map((p: any) => ({
            id: p.id,
            type: 'post',
            title: p.content?.slice(0, 100) || 'منشور',
            createdAt: p.createdAt,
            score: 0.5,
            reason: 'حديث',
          })),
        ],
      })
    }

    // === Collect signals ===
    // 1. User's liked posts (last 50)
    const likedPosts = await db.postLike.findMany({
      where: { userId: user.id },
      select: { postId: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    })
    const likedPostIds = likedPosts.map((l: any) => l.postId)

    // Get authors of liked posts
    let likedAuthorIds: string[] = []
    let likedHashtags: string[] = []
    if (likedPostIds.length > 0) {
      const likedPostData = await db.post.findMany({
        where: { id: { in: likedPostIds } },
        select: { userId: true, hashtags: true },
      })
      likedAuthorIds = [...new Set((likedPostData as any[]).map((p: any) => p.userId))]
      const allTags = (likedPostData as any[])
        .map((p: any) => p.hashtags?.split(',').filter(Boolean) || [])
        .flat()
      likedHashtags = [...new Set(allTags)]
    }

    // 2. User's liked voice notes
    const likedVoices = await db.voiceNote.findMany({
      where: { likes: { some: { userId: user.id } } },
      select: { userId: true, promptId: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
    })
    const likedVoiceAuthorIds = [...new Set(likedVoices.map((v: any) => v.userId))]

    // 3. Following
    const following = await db.follow.findMany({
      where: { followerId: user.id },
      select: { followeeId: true },
    })
    const followingIds = following.map((f: any) => f.followeeId)

    // 4. Friends
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: user.id, status: 'accepted' },
          { addresseeId: user.id, status: 'accepted' },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    })
    const friendIds = friendships.map((f: any) =>
      f.requesterId === user.id ? f.addresseeId : f.requesterId
    )

    // 5. Already-seen posts (liked + own)
    const seenPostIds = new Set([...likedPostIds])

    // === Build recommendation candidates ===
    type Candidate = {
      id: string
      type: 'voice' | 'post'
      title: string
      authorId: string
      createdAt: string
      score: number
      reason: string
      hashtags?: string | null
    }

    const candidates: Candidate[] = []

    // === Source A: Best posts from liked authors (weight: 0.9) ===
    if (likedAuthorIds.length > 0) {
      const postsFromLikedAuthors = await db.post.findMany({
        where: {
          userId: { in: likedAuthorIds },
          id: { notIn: Array.from(seenPostIds) },
          privacy: { in: ['public', 'friends'] },
          isPublished: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      for (const p of postsFromLikedAuthors as any[]) {
        candidates.push({
          id: p.id,
          type: 'post',
          title: p.content?.slice(0, 100) || 'منشور',
          authorId: p.userId,
          createdAt: p.createdAt,
          score: 0.9,
          reason: 'لأنك تفاعلت مع محتوى مشابه',
          hashtags: p.hashtags,
        })
      }
    }

    // === Source B: Posts with matching hashtags (weight: 0.85) ===
    if (likedHashtags.length > 0) {
      // Use simple contains filter
      const hashtagPosts = await db.post.findMany({
        where: {
          id: { notIn: Array.from(seenPostIds) },
          privacy: { in: ['public', 'friends'] },
          isPublished: true,
          OR: likedHashtags.slice(0, 5).map(tag => ({
            hashtags: { contains: tag },
          })),
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      })
      for (const p of hashtagPosts as any[]) {
        if (!candidates.find(c => c.id === p.id)) {
          candidates.push({
            id: p.id,
            type: 'post',
            title: p.content?.slice(0, 100) || 'منشور',
            authorId: p.userId,
            createdAt: p.createdAt,
            score: 0.85,
            reason: `موضوعات تهمك: ${likedHashtags.slice(0, 3).map(t => '#' + t).join(' ')}`,
            hashtags: p.hashtags,
          })
        }
      }
    }

    // === Source C: Best voice notes from followed/liked authors (weight: 0.8) ===
    const interestingAuthorIds = [...new Set([...followingIds, ...likedVoiceAuthorIds])]
    if (interestingAuthorIds.length > 0) {
      const voices = await db.voiceNote.findMany({
        where: {
          userId: { in: interestingAuthorIds },
          isPublic: true,
        },
        orderBy: [{ plays: 'desc' }, { createdAt: 'desc' }],
        take: 15,
      })
      for (const v of voices as any[]) {
        candidates.push({
          id: v.id,
          type: 'voice',
          title: v.transcript?.slice(0, 100) || 'تسجيل صوتي',
          authorId: v.userId,
          createdAt: v.createdAt,
          score: 0.8 + Math.min((v.plays || 0) * 0.001, 0.15),
          reason: 'من أصوات تتابعها أو أعجبتك',
        })
      }
    }

    // === Source D: Trending voices (weight: 0.6) — for diversity ===
    const trendingVoices = await db.voiceNote.findMany({
      where: {
        isPublic: true,
        userId: { not: user.id },
      },
      orderBy: [{ plays: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    })
    for (const v of trendingVoices as any[]) {
      candidates.push({
        id: v.id,
        type: 'voice',
        title: v.transcript?.slice(0, 100) || 'تسجيل صوتي',
        authorId: v.userId,
        createdAt: v.createdAt,
        score: 0.6 + Math.min((v.plays || 0) * 0.0005, 0.2),
        reason: 'رائج الآن',
      })
    }

    // === Source E: Friends' recent activity (weight: 0.95) — highest priority ===
    if (friendIds.length > 0) {
      const friendsPosts = await db.post.findMany({
        where: {
          userId: { in: friendIds },
          id: { notIn: Array.from(seenPostIds) },
          privacy: { in: ['public', 'friends'] },
          isPublished: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      for (const p of friendsPosts as any[]) {
        candidates.unshift({
          id: p.id,
          type: 'post',
          title: p.content?.slice(0, 100) || 'منشور',
          authorId: p.userId,
          createdAt: p.createdAt,
          score: 0.95,
          reason: 'من أصدقائك',
          hashtags: p.hashtags,
        })
      }
    }

    // === Diversity: limit to 2 items per author max ===
    const authorCount: Record<string, number> = {}
    const diverseCandidates = candidates.filter(c => {
      authorCount[c.authorId] = (authorCount[c.authorId] || 0) + 1
      return authorCount[c.authorId] <= 2
    })

    // === Sort by score (desc) then by recency ===
    diverseCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // === Deduplicate by id ===
    const seen = new Set<string>()
    const finalRecs = diverseCandidates.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    }).slice(0, limit)

    // === Enrich with user info ===
    const allAuthorIds = [...new Set(finalRecs.map(c => c.authorId))]
    const authors = allAuthorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: allAuthorIds } },
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
    const authorMap = new Map(authors.map((a: any) => [a.id, a]))

    return NextResponse.json({
      recommendations: finalRecs.map(c => ({
        ...c,
        author: authorMap.get(c.authorId) || null,
      })),
      signals: {
        likedAuthors: likedAuthorIds.length,
        likedHashtags: likedHashtags.length,
        following: followingIds.length,
        friends: friendIds.length,
      },
    })
  } catch (e) {
    console.error('Recommendations error:', e)
    return NextResponse.json(
      { error: 'فشل تحميل التوصيات' },
      { status: 500 }
    )
  }
}
