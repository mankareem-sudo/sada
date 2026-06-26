import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/voice-notes/replies?voiceNoteId=xxx
 *
 * Returns all voice replies (duets) for a given voice note.
 * Sorted by recency (newest first).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const voiceNoteId = url.searchParams.get('voiceNoteId')
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)

    if (!voiceNoteId) {
      return NextResponse.json({ error: 'missing voiceNoteId' }, { status: 400 })
    }

    // Verify parent exists
    const parent = await db.voiceNote.findUnique({ where: { id: voiceNoteId } })
    if (!parent) {
      return NextResponse.json({ error: 'الصدى الأصلي غير موجود' }, { status: 404 })
    }

    // Fetch replies
    const replies = await db.voiceNote.findMany({
      where: { replyToId: voiceNoteId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    if (replies.length === 0) {
      return NextResponse.json({ replies: [] })
    }

    // Get user info for each reply
    const userIds = [...new Set((replies as any[]).map((r: any) => r.userId))]
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

    // Get like counts + my likes
    const currentUser = await getCurrentUser()
    const replyIds = (replies as any[]).map((r: any) => r.id)
    let myLikes: any[] = []
    let likeCounts: Record<string, number> = {}

    if (replyIds.length > 0) {
      const allLikes = await db.like.findMany({
        where: { voiceNoteId: { in: replyIds } },
        select: { voiceNoteId: true, userId: true },
      })
      for (const l of allLikes as any[]) {
        likeCounts[l.voiceNoteId] = (likeCounts[l.voiceNoteId] || 0) + 1
      }
      if (currentUser) {
        myLikes = (allLikes as any[]).filter((l: any) => l.userId === currentUser.id)
      }
    }
    const myLikeSet = new Set(myLikes.map((l: any) => l.voiceNoteId))

    return NextResponse.json({
      replies: (replies as any[]).map((r: any) => ({
        id: r.id,
        durationSec: r.durationSec,
        mimeType: r.mimeType,
        audioData: r.audioData,
        description: r.description,
        transcript: r.transcript,
        plays: r.plays,
        createdAt: r.createdAt,
        replyToId: r.replyToId,
        user: userMap.get(r.userId) || null,
        likedByMe: myLikeSet.has(r.id),
        likesCount: likeCounts[r.id] || 0,
      })),
      parent: {
        id: parent.id,
        userId: parent.userId,
        description: parent.description,
      },
    })
  } catch (e) {
    console.error('Voice replies fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل الردود الصوتية' }, { status: 500 })
  }
}
