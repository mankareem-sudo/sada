import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/circles/feed?circleId=xxx
 *
 * Returns voice notes from members of a specific circle.
 * Respects circle type:
 * - public: anyone can view
 * - private: only members can view
 * - secret: only members can view
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const url = new URL(req.url)
    const circleId = url.searchParams.get('circleId')
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)

    if (!circleId) {
      return NextResponse.json({ error: 'missing circleId' }, { status: 400 })
    }

    // Get circle
    const circle = await db.voiceCircle.findUnique({ where: { id: circleId } })
    if (!circle) {
      return NextResponse.json({ error: 'الدايرة مش موجودة' }, { status: 404 })
    }

    // Check access for private/secret circles
    if (circle.type !== 'public' && user) {
      const membership = await db.voiceCircleMember.findFirst({
        where: { circleId, userId: user.id },
      })
      if (!membership) {
        return NextResponse.json(
          { error: 'ما تقدرش تشوف محتوى هذه الدايرة — لازم تنضم الأول' },
          { status: 403 }
        )
      }
    } else if (circle.type !== 'public' && !user) {
      return NextResponse.json(
        { error: 'سجّل دخول الأول عشان تشوف هذه الدايرة' },
        { status: 401 }
      )
    }

    // Get member user IDs
    const members = await db.voiceCircleMember.findMany({
      where: { circleId },
      select: { userId: true },
    })
    const memberUserIds = (members as any[]).map((m: any) => m.userId)

    if (memberUserIds.length === 0) {
      return NextResponse.json({ notes: [] })
    }

    // Fetch voice notes from circle members
    const notes = await db.voiceNote.findMany({
      where: {
        userId: { in: memberUserIds },
        replyToId: null, // top-level notes only
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Enrich with user info
    const userIds = [...new Set((notes as any[]).map((n: any) => n.userId))]
    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
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
    const userMap = new Map((users as any[]).map((u: any) => [u.id, u]))

    // Get like counts
    const noteIds = (notes as any[]).map((n: any) => n.id)
    let likeCounts: Record<string, number> = {}
    let myLikes: any[] = []

    if (noteIds.length > 0) {
      const allLikes = await db.like.findMany({
        where: { voiceNoteId: { in: noteIds } },
        select: { voiceNoteId: true, userId: true },
      })
      for (const l of allLikes as any[]) {
        likeCounts[l.voiceNoteId] = (likeCounts[l.voiceNoteId] || 0) + 1
      }
      if (user) {
        myLikes = (allLikes as any[]).filter((l: any) => l.userId === user.id)
      }
    }
    const myLikeSet = new Set(myLikes.map((l: any) => l.voiceNoteId))

    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        type: circle.type,
        rules: circle.rules,
        coverColor: circle.coverColor,
        membersCount: circle.membersCount,
      },
      notes: (notes as any[]).map((n: any) => ({
        id: n.id,
        durationSec: n.durationSec,
        mimeType: n.mimeType,
        audioData: n.audioData,
        description: n.description,
        transcript: n.transcript,
        plays: n.plays,
        createdAt: n.createdAt,
        user: userMap.get(n.userId) || null,
        likedByMe: myLikeSet.has(n.id),
        likesCount: likeCounts[n.id] || 0,
      })),
    })
  } catch (e) {
    console.error('Circle feed error', e)
    return NextResponse.json({ error: 'فشل تحميل محتوى الدايرة' }, { status: 500 })
  }
}
