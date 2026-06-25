import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/stories/feed
 *
 * Returns active (non-expired) stories from:
 * 1. The current user (their own stories)
 * 2. Their friends
 * 3. Users they follow
 *
 * Stories expire after 24 hours automatically (filtered here).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Get user's friends + following
    const [friendships, follows] = await Promise.all([
      db.friendship.findMany({
        where: {
          OR: [
            { requesterId: user.id, status: 'accepted' },
            { addresseeId: user.id, status: 'accepted' },
          ],
        },
        select: { requesterId: true, addresseeId: true },
      }),
      db.follow.findMany({
        where: { followerId: user.id },
        select: { followeeId: true },
      }),
    ])

    const friendIds = friendships.map((f: any) =>
      f.requesterId === user.id ? f.addresseeId : f.requesterId
    )
    const followingIds = follows.map((f: any) => f.followeeId)

    // Combine: me + friends + following
    const authorIds = [...new Set([user.id, ...friendIds, ...followingIds])]

    // Fetch active stories
    const stories = await db.voiceStory.findMany({
      where: {
        userId: { in: authorIds },
        expiresAt: { gt: now },
        isExpired: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    if (stories.length === 0) {
      return NextResponse.json({ stories: [], grouped: [] })
    }

    // Get author info
    const allAuthorIds = [...new Set(stories.map((s: any) => s.userId))]
    const authors = await db.user.findMany({
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
    const authorMap = new Map(authors.map((a: any) => [a.id, a]))

    // Get which stories the current user has already viewed
    const storyIds = stories.map((s: any) => s.id)
    const myViews = await db.voiceStoryView.findMany({
      where: {
        storyId: { in: storyIds },
        userId: user.id,
      },
      select: { storyId: true },
    })
    const viewedSet = new Set(myViews.map((v: any) => v.storyId))

    // Group stories by author (for the stories bar at top)
    const groupedMap = new Map<string, any>()
    for (const story of stories as any[]) {
      const author = authorMap.get(story.userId)
      if (!author) continue

      if (!groupedMap.has(story.userId)) {
        groupedMap.set(story.userId, {
          author,
          stories: [],
          hasUnviewed: false,
        })
      }
      const group = groupedMap.get(story.userId)
      const isViewed = viewedSet.has(story.id)
      if (!isViewed) group.hasUnviewed = true
      group.stories.push({
        id: story.id,
        durationSec: story.durationSec,
        backgroundColor: story.backgroundColor,
        transcript: story.transcript,
        viewsCount: story.viewsCount,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        isViewed,
        isMine: story.userId === user.id,
      })
    }

    return NextResponse.json({
      stories: stories.map((s: any) => ({
        ...s,
        author: authorMap.get(s.userId),
        isViewed: viewedSet.has(s.id),
        isMine: s.userId === user.id,
      })),
      grouped: Array.from(groupedMap.values()),
    })
  } catch (e) {
    console.error('Stories feed error', e)
    return NextResponse.json({ error: 'فشل تحميل الستوريز' }, { status: 500 })
  }
}
