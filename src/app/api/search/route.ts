import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sanitizeText } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/search?q=xxx&type=all|users|voices
 *
 * Searches:
 * - users (by username/name) — Supabase-compatible (no OR, query both separately)
 * - voice notes (by description + transcript)
 */
export async function GET(req: NextRequest) {
  const rateCheck = checkRateLimit(req, 'search')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }

  const url = new URL(req.url)
  const q = sanitizeText(url.searchParams.get('q') || '', 100)
  const type = url.searchParams.get('type') || 'all'

  if (q.length < 1) {
    return NextResponse.json({ users: [], voiceNotes: [] })
  }

  // === Search users ===
  let users: any[] = []
  if (type === 'all' || type === 'users') {
    // Supabase wrapper doesn't support OR — query both fields separately
    const [byUsername, byName] = await Promise.all([
      db.user.findMany({
        where: { username: { contains: q.toLowerCase() } },
        take: 20,
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
          avatarUrl: true,
          isVerified: true,
          bio: true,
        },
      }),
      db.user.findMany({
        where: { name: { contains: q } },
        take: 20,
        select: {
          id: true,
          username: true,
          name: true,
          avatarColor: true,
          avatarUrl: true,
          isVerified: true,
          bio: true,
        },
      }),
    ])

    // Merge + dedupe
    const userMap = new Map<string, any>()
    for (const u of [...(byUsername as any[]), ...(byName as any[])]) {
      userMap.set(u.id, u)
    }
    users = Array.from(userMap.values()).slice(0, 20)
  }

  // === Search voice notes ===
  let voiceNotes: any[] = []
  if (type === 'all' || type === 'voices') {
    // Query by description + transcript separately
    const [byDescription, byTranscript] = await Promise.all([
      db.voiceNote.findMany({
        where: { description: { contains: q } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.voiceNote.findMany({
        where: { transcript: { contains: q } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    // Merge + dedupe
    const noteMap = new Map<string, any>()
    for (const n of [...(byDescription as any[]), ...(byTranscript as any[])]) {
      noteMap.set(n.id, n)
    }
    const allNotes = Array.from(noteMap.values()).slice(0, 20)

    // Enrich with user info
    const userIds = [...new Set(allNotes.map((n: any) => n.userId))]
    const usersData = userIds.length > 0
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
    const userMap = new Map((usersData as any[]).map((u: any) => [u.id, u]))

    // Get prompts
    const promptIds = [...new Set(allNotes.map((n: any) => n.promptId).filter(Boolean))]
    const prompts = promptIds.length > 0
      ? await db.prompt.findMany({
          where: { id: { in: promptIds } },
        })
      : []
    const promptMap = new Map((prompts as any[]).map((p: any) => [p.id, p]))

    voiceNotes = allNotes.map((n: any) => ({
      id: n.id,
      durationSec: n.durationSec,
      mimeType: n.mimeType,
      audioData: n.audioData,
      description: n.description,
      transcript: n.transcript,
      plays: n.plays,
      createdAt: n.createdAt,
      user: userMap.get(n.userId) || null,
      prompt: n.promptId
        ? {
            id: promptMap.get(n.promptId)?.id,
            text: promptMap.get(n.promptId)?.text,
            date: promptMap.get(n.promptId)?.date,
          }
        : null,
    }))
  }

  return NextResponse.json({
    users,
    voiceNotes,
  })
}
