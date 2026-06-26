import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/posts/poll/vote
 * body: { postId, optionId }
 *
 * Casts a vote on a poll post. Behavior:
 *  - If pollAllowMultiple=true: adds the vote (toggles off if already voted same option)
 *  - Otherwise: replaces any existing vote with the new one
 *
 * Returns: { voted: true, optionId, totals: { optionId: count } }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { postId, optionId } = body as { postId?: string; optionId?: string }

  if (!postId || !optionId) {
    return NextResponse.json({ error: 'missing postId or optionId' }, { status: 400 })
  }

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post) {
    return NextResponse.json({ error: 'المنشور غير موجود' }, { status: 404 })
  }

  if (post.type !== 'poll' || !post.pollOptions) {
    return NextResponse.json({ error: 'المنشور ليس استطلاعاً' }, { status: 400 })
  }

  // Check poll expiry
  if (post.pollExpiresAt && new Date(post.pollExpiresAt) < new Date()) {
    return NextResponse.json({ error: 'الاستطلاع انتهى' }, { status: 400 })
  }

  // Validate optionId belongs to this poll
  let options: Array<{ id: string; text: string }> = []
  try {
    options = JSON.parse(post.pollOptions)
  } catch {
    return NextResponse.json({ error: 'خطأ في بيانات الاستطلاع' }, { status: 500 })
  }
  if (!options.some(o => o.id === optionId)) {
    return NextResponse.json({ error: 'خيار غير صحيح' }, { status: 400 })
  }

  const allowMultiple = !!post.pollAllowMultiple

  // Check existing votes by this user
  const existingVotes = await db.pollVote.findMany({
    where: { postId, userId: user.id },
  })

  if (allowMultiple) {
    // Toggle the specific option
    const existingForOption = existingVotes.find(v => v.optionId === optionId)
    if (existingForOption) {
      // Remove it
      await db.pollVote.delete({ where: { id: existingForOption.id } })
    } else {
      // Add it
      await db.pollVote.create({
        data: {
          id: generateId(),
          postId,
          userId: user.id,
          optionId,
          createdAt: new Date().toISOString(),
        },
      })
    }
  } else {
    // Single choice — replace existing
    if (existingVotes.length > 0) {
      // If voting the same one again, remove it (toggle off)
      const sameOption = existingVotes.find(v => v.optionId === optionId)
      if (sameOption) {
        await db.pollVote.delete({ where: { id: sameOption.id } })
      } else {
        // Delete all old, add new
        for (const v of existingVotes) {
          await db.pollVote.delete({ where: { id: v.id } }).catch(() => {})
        }
        await db.pollVote.create({
          data: {
            id: generateId(),
            postId,
            userId: user.id,
            optionId,
            createdAt: new Date().toISOString(),
          },
        })
      }
    } else {
      // Just add new
      await db.pollVote.create({
        data: {
          id: generateId(),
          postId,
          userId: user.id,
          optionId,
          createdAt: new Date().toISOString(),
        },
      })
    }
  }

  // Compute totals
  const allVotes = await db.pollVote.findMany({
    where: { postId },
    select: { optionId: true },
  })
  const totals: Record<string, number> = {}
  for (const v of allVotes as any[]) {
    totals[v.optionId] = (totals[v.optionId] || 0) + 1
  }

  // Notify poll owner (if not voting on own post)
  if (post.userId !== user.id) {
    await db.notification.create({
      data: {
        id: generateId(),
        recipientId: post.userId,
        actorId: user.id,
        type: 'poll_vote',
        text: `${user.name} صوّت في استطلاعك`,
        read: false,
        createdAt: new Date().toISOString(),
      },
    }).catch(() => {})
  }

  return NextResponse.json({
    voted: true,
    optionId,
    totals,
    totalVotes: (allVotes as any[]).length,
  })
}
