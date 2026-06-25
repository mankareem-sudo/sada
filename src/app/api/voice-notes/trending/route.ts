import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/voice-notes/trending?range=24h|7d|30d
 *
 * Returns trending voice notes ranked by engagement score:
 *   score = plays + (likesCount × 2) + (commentsCount × 3) + timeDecayBonus
 *
 * timeDecayBonus: newer notes get a small boost (0-10 points based on recency)
 *
 * Works with Supabase wrapper (no Prisma include/_count).
 */
export async function GET(req: any) {
  try {
    const url = new URL(req.url)
    const range = url.searchParams.get('range') || '7d'
    const limit = Math.min(Number(url.searchParams.get('limit') || 30), 50)

    // Calculate time range
    const now = Date.now()
    const rangeMs =
      range === '24h' ? 24 * 60 * 60 * 1000 :
      range === '30d' ? 30 * 24 * 60 * 60 * 1000 :
      7 * 24 * 60 * 60 * 1000 // default 7d
    const sinceDate = new Date(now - rangeMs).toISOString()

    const user = await getCurrentUser()

    // Fetch voice notes in range (top-level only, not replies)
    const notes = await db.voiceNote.findMany({
      where: {
        createdAt: { gte: sinceDate },
        replyToId: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    if (notes.length === 0) {
      return NextResponse.json({ notes: [] })
    }

    const noteIds = (notes as any[]).map((n: any) => n.id)

    // Fetch like counts (group by voiceNoteId)
    const allLikes = await db.like.findMany({
      where: { voiceNoteId: { in: noteIds } },
      select: { voiceNoteId: true, userId: true },
    })
    const likeCounts: Record<string, number> = {}
    const myLikedIds = new Set<string>()
    for (const l of allLikes as any[]) {
      likeCounts[l.voiceNoteId] = (likeCounts[l.voiceNoteId] || 0) + 1
      if (user && l.userId === user.id) {
        myLikedIds.add(l.voiceNoteId)
      }
    }

    // Fetch comment counts
    const allComments = await db.comment.findMany({
      where: { voiceNoteId: { in: noteIds } },
      select: { voiceNoteId: true },
    })
    const commentCounts: Record<string, number> = {}
    for (const c of allComments as any[]) {
      commentCounts[c.voiceNoteId] = (commentCounts[c.voiceNoteId] || 0) + 1
    }

    // Fetch bookmarks for current user
    let myBookmarkedIds = new Set<string>()
    if (user) {
      const myBookmarks = await db.bookmark.findMany({
        where: { userId: user.id, voiceNoteId: { in: noteIds } },
        select: { voiceNoteId: true },
      })
      myBookmarkedIds = new Set((myBookmarks as any[]).map((b: any) => b.voiceNoteId))
    }

    // Fetch users
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

    // Fetch prompts
    const promptIds = [...new Set((notes as any[]).map((n: any) => n.promptId).filter(Boolean))]
    const prompts = promptIds.length > 0
      ? await db.prompt.findMany({ where: { id: { in: promptIds } } })
      : []
    const promptMap = new Map((prompts as any[]).map((p: any) => [p.id, p]))

    // Compute trending score with time decay
    const scored = (notes as any[])
      .map((n: any) => {
        const likesCount = likeCounts[n.id] || 0
        const commentsCount = commentCounts[n.id] || 0
        const plays = n.plays || 0

        // Base engagement score
        const engagementScore = plays + (likesCount * 2) + (commentsCount * 3)

        // Time decay bonus: newer = higher (0-10 points)
        const ageHours = (now - new Date(n.createdAt).getTime()) / (1000 * 60 * 60)
        const rangeHours = rangeMs / (1000 * 60 * 60)
        const timeDecayBonus = Math.max(0, 10 * (1 - ageHours / rangeHours))

        const totalScore = engagementScore + timeDecayBonus

        return { note: n, score: totalScore }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json({
      notes: scored.map(({ note, score }) => ({
        id: note.id,
        durationSec: note.durationSec,
        mimeType: note.mimeType,
        audioData: note.audioData,
        description: note.description,
        transcript: note.transcript,
        plays: note.plays,
        createdAt: note.createdAt,
        trendingScore: Math.round(score),
        prompt: note.promptId
          ? {
              id: promptMap.get(note.promptId)?.id,
              text: promptMap.get(note.promptId)?.text,
              date: promptMap.get(note.promptId)?.date,
            }
          : null,
        user: userMap.get(note.userId) || null,
        likedByMe: myLikedIds.has(note.id),
        bookmarkedByMe: myBookmarkedIds.has(note.id),
        likesCount: likeCounts[note.id] || 0,
        commentsCount: commentCounts[note.id] || 0,
      })),
    })
  } catch (e) {
    console.error('Trending fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل الرائج' }, { status: 500 })
  }
}
