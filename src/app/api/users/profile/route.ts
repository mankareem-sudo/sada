import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'

/**
 * GET /api/users/profile?username=xxx
 * or ?userId=xxx
 * Returns profile + recent voice notes + follow state
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const username = url.searchParams.get('username')
  const userId = url.searchParams.get('userId')

  if (!username && !userId) {
    return NextResponse.json({ error: 'missing param' }, { status: 400 })
  }

  const target = await db.user.findFirst({
    where: username ? { username: username.toLowerCase() } : { id: userId! },
  }) as any

  if (!target) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
  }

  // Fetch related data in parallel
  const [voiceNotes, followersCount, followingCount, voiceNotesCount] = await Promise.all([
    db.voiceNote.findMany({
      where: { userId: target.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.follow.count({ where: { followeeId: target.id } }),
    db.follow.count({ where: { followerId: target.id } }),
    db.voiceNote.count({ where: { userId: target.id } }),
  ])

  // Get likes + comments counts for each voice note
  const voiceNoteIds = (voiceNotes as any[]).map((n) => n.id)
  let likesCounts: Record<string, number> = {}
  let commentsCounts: Record<string, number> = {}
  let promptsMap: Record<string, any> = {}
  
  if (voiceNoteIds.length > 0) {
    const [allLikes, allComments, allVoiceNotesWithPrompts] = await Promise.all([
      db.like.findMany({
        where: { voiceNoteId: { in: voiceNoteIds } },
        select: { voiceNoteId: true },
      }),
      db.comment.findMany({
        where: { voiceNoteId: { in: voiceNoteIds } },
        select: { voiceNoteId: true },
      }),
      db.voiceNote.findMany({
        where: { id: { in: voiceNoteIds } },
        select: { id: true, promptId: true },
      }),
    ])
    
    for (const l of allLikes as any[]) {
      likesCounts[l.voiceNoteId] = (likesCounts[l.voiceNoteId] || 0) + 1
    }
    for (const c of allComments as any[]) {
      commentsCounts[c.voiceNoteId] = (commentsCounts[c.voiceNoteId] || 0) + 1
    }
    
    // Fetch prompts separately
    const promptIds = (allVoiceNotesWithPrompts as any[])
      .map((vn) => vn.promptId)
      .filter(Boolean)
    const uniquePromptIds = [...new Set(promptIds)]
    if (uniquePromptIds.length > 0) {
      const prompts = await db.prompt.findMany({
        where: { id: { in: uniquePromptIds } },
      })
      for (const p of prompts as any[]) {
        promptsMap[p.id] = p
      }
    }
  }

  const currentUser = await getCurrentUser()
  let isFollowing = false
  if (currentUser && currentUser.id !== target.id) {
    const f = await db.follow.findFirst({
      where: {
        followerId: currentUser.id,
        followeeId: target.id,
      },
    })
    isFollowing = !!f
  }

  return NextResponse.json({
    user: {
      id: target.id,
      username: target.username,
      name: target.name,
      bio: target.bio,
      avatarColor: target.avatarColor,
      avatarUrl: target.avatarUrl,
      createdAt: target.createdAt,
    },
    stats: {
      followers: followersCount,
      following: followingCount,
      voiceNotes: voiceNotesCount,
    },
    isFollowing,
    isMe: currentUser?.id === target.id,
    voiceNotes: (voiceNotes as any[]).map((n) => ({
      id: n.id,
      durationSec: n.durationSec,
      mimeType: n.mimeType,
      audioData: n.audioData,
      description: n.description,
      transcript: n.transcript,
      plays: n.plays,
      likesCount: likesCounts[n.id] || 0,
      commentsCount: commentsCounts[n.id] || 0,
      createdAt: n.createdAt,
      prompt: n.promptId
        ? {
            id: promptsMap[n.promptId]?.id,
            text: promptsMap[n.promptId]?.text,
            date: promptsMap[n.promptId]?.date,
          }
        : null,
    })),
  })
}

/**
 * PATCH /api/users/profile
 * body: { name?, bio? }
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { name, bio } = body as { name?: string; bio?: string }

  const data: any = {}
  if (typeof name === 'string') {
    const cleanName = sanitizeText(name, 50)
    if (cleanName.length >= 2) {
      if (detectXSS(cleanName)) {
        return NextResponse.json({ error: 'محتوى غير مسموح في الاسم' }, { status: 400 })
      }
      data.name = cleanName
    }
  }
  if (typeof bio === 'string') {
    const cleanBio = sanitizeText(bio, 200)
    if (detectXSS(cleanBio)) {
      return NextResponse.json({ error: 'محتوى غير مسموح في النبذة' }, { status: 400 })
    }
    data.bio = cleanBio
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'مفيش بيانات للتحديث' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
  })

  return NextResponse.json({
    user: {
      id: updated.id,
      username: updated.username,
      name: updated.name,
      bio: updated.bio,
      avatarColor: updated.avatarColor,
    },
  })
}
