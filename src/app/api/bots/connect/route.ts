import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { pickRandom, pickRandomMany } from '@/lib/egyptian-bots'

/**
 * POST /api/bots/connect
 *
 * Creates social connections between bots:
 * - Each bot follows 10-30 random other bots
 * - Creates 5-15 accepted friendships per bot
 * - Creates some pending friend requests
 *
 * This makes the bot community look like a real social network.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const internalToken = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'
    if (authHeader !== `Bearer ${internalToken}`) {
      const { getCurrentUser } = await import('@/lib/auth')
      const user = await getCurrentUser()
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
      }
    }

    const bots = await db.user.findMany({
      where: { email: { contains: '@sada-bots.local' } },
      select: { id: true, username: true, name: true },
    })

    if ((bots as any[]).length < 2) {
      return NextResponse.json({ error: 'محتاج على الأقل بوتين' })
    }

    let followsCreated = 0
    let friendshipsCreated = 0
    let pendingRequests = 0
    const now = new Date().toISOString()

    for (const bot of bots as any[]) {
      // Other bots (exclude self)
      const others = (bots as any[]).filter((b: any) => b.id !== bot.id)
      if (others.length === 0) continue

      // Each bot follows 10-30 random bots
      const followCount = Math.min(Math.floor(Math.random() * 20) + 10, others.length)
      const toFollow = pickRandomMany(others, followCount)

      for (const target of toFollow) {
        // Check if already following
        const existing = await db.follow.findFirst({
          where: { followerId: bot.id, followeeId: target.id },
        })
        if (!existing) {
          await db.follow.create({
            data: {
              id: generateId(),
              followerId: bot.id,
              followeeId: target.id,
              createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
            },
          })
          followsCreated++
        }
      }

      // Create 5-15 accepted friendships
      const friendCount = Math.min(Math.floor(Math.random() * 10) + 5, others.length)
      const friends = pickRandomMany(others, friendCount)

      for (const friend of friends) {
        // Check if friendship already exists (either direction)
        const existing1 = await db.friendship.findFirst({
          where: { requesterId: bot.id, addresseeId: friend.id },
        })
        const existing2 = await db.friendship.findFirst({
          where: { requesterId: friend.id, addresseeId: bot.id },
        })

        if (!existing1 && !existing2) {
          // 80% accepted, 20% pending
          const status = Math.random() < 0.8 ? 'accepted' : 'pending'
          await db.friendship.create({
            data: {
              id: generateId(),
              requesterId: bot.id,
              addresseeId: friend.id,
              status,
              createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: now,
            },
          })
          if (status === 'accepted') {
            friendshipsCreated++
          } else {
            pendingRequests++
          }
        }
      }

      // Small delay every 10 bots
      if (followsCreated % 100 === 0) {
        await new Promise((r) => setTimeout(r, 100))
      }
    }

    return NextResponse.json({
      success: true,
      followsCreated,
      friendshipsCreated,
      pendingRequests,
      totalBots: (bots as any[]).length,
    })
  } catch (e) {
    console.error('Connect error', e)
    return NextResponse.json({ error: 'فشل ربط البوتات' }, { status: 500 })
  }
}
