import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/account/export
 * Exports all user data as JSON (GDPR compliance)
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  // Get all user data
  const [voiceNotes, posts, comments, likes, bookmarks, follows, followers, friends, messages, notifications, donations] = await Promise.all([
    db.voiceNote.findMany({ where: { userId: user.id }, select: { id: true, durationSec: true, description: true, transcript: true, plays: true, createdAt: true } }),
    db.post.findMany({ where: { userId: user.id }, select: { id: true, type: true, content: true, privacy: true, createdAt: true } }),
    db.comment.findMany({ where: { userId: user.id }, select: { id: true, content: true, createdAt: true } }),
    db.like.findMany({ where: { userId: user.id }, select: { voiceNoteId: true, createdAt: true } }),
    db.bookmark.findMany({ where: { userId: user.id }, select: { voiceNoteId: true, createdAt: true } }),
    db.follow.findMany({ where: { followerId: user.id }, select: { followeeId: true, createdAt: true } }),
    db.follow.findMany({ where: { followeeId: user.id }, select: { followerId: true, createdAt: true } }),
    db.friendship.findMany({ where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }], status: 'accepted' }, select: { id: true, status: true, createdAt: true } }),
    db.message.findMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] }, select: { id: true, content: true, senderId: true, receiverId: true, createdAt: true } }),
    db.notification.findMany({ where: { recipientId: user.id }, select: { id: true, type: true, text: true, read: true, createdAt: true } }),
    db.supportDonation.findMany({ where: { userId: user.id }, select: { id: true, amount: true, currency: true, createdAt: true } }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    },
    voiceNotes,
    posts,
    comments,
    likes,
    bookmarks,
    following: follows,
    followers,
    friends,
    messages,
    notifications,
    donations,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="sada-data-${user.username}.json"`,
    },
  })
}
