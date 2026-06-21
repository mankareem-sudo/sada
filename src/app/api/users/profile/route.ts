import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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
    include: {
      voiceNotes: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { prompt: true },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          voiceNotes: true,
        },
      },
    },
  })

  if (!target) {
    return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
  }

  const currentUser = await getCurrentUser()
  let isFollowing = false
  if (currentUser && currentUser.id !== target.id) {
    const f = await db.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId: currentUser.id,
          followeeId: target.id,
        },
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
      createdAt: target.createdAt,
    },
    stats: {
      followers: target._count.followers,
      following: target._count.following,
      voiceNotes: target._count.voiceNotes,
    },
    isFollowing,
    isMe: currentUser?.id === target.id,
    voiceNotes: target.voiceNotes.map((n) => ({
      id: n.id,
      durationSec: n.durationSec,
      mimeType: n.mimeType,
      audioData: n.audioData,
      transcript: n.transcript,
      plays: n.plays,
      createdAt: n.createdAt,
      prompt: n.prompt
        ? { id: n.prompt.id, text: n.prompt.text, date: n.prompt.date }
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
  if (typeof name === 'string' && name.trim().length >= 2) {
    data.name = name.trim().slice(0, 50)
  }
  if (typeof bio === 'string') {
    data.bio = bio.trim().slice(0, 200)
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
