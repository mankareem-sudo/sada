import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/users/suggestions
 * Returns "Who to follow" — users not followed + not blocked, limited to 10.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  // Get users I follow
  const following = await db.follow.findMany({ where: { followerId: user.id }, select: { followeeId: true } })
  const followingIds = following.map((f: any) => f.followeeId)
  
  // Get users I blocked
  const blocks = await db.block.findMany({ where: { blockerId: user.id }, select: { blockedId: true } })
  const blockedIds = blocks.map((b: any) => b.blockedId)

  const excludeIds = [user.id, ...followingIds, ...blockedIds]

  // Get random users
  const users = await db.user.findMany({
    where: { id: { notIn: excludeIds } },
    take: 10,
  })

  return NextResponse.json({
    suggestions: users.map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      avatarColor: u.avatarColor,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
    })),
  })
}
