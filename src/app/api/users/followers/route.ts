import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/users/followers?userId=xxx
 * Returns list of users who follow the given user.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'missing userId' }, { status: 400 })
  }

  const follows = await db.follow.findMany({
    where: { followeeId: userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      follower: {
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
    users: follows.map((f) => f.follower),
  })
}
