import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null })
  }

  const [followersCount, followingCount, voiceNotesCount] = await Promise.all([
    db.follow.count({ where: { followeeId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
    db.voiceNote.count({ where: { userId: user.id } }),
  ])

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatarColor: user.avatarColor,
      isAdmin: user.isAdmin,
    },
    stats: {
      followers: followersCount,
      following: followingCount,
      voiceNotes: voiceNotesCount,
    },
  })
}
