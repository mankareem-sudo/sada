import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/users/following?userId=xxx
 * Returns list of users the given user is following.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'missing userId' }, { status: 400 })
  }

  const follows = await db.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      followee: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
          bio: true,
        },
      },
    },
  })

  return NextResponse.json({
    users: follows.map((f) => f.followee),
  })
}
