import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/posts/pin
 * body: { id }
 * Pins a post to user's profile (only 1 pinned at a time).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { id } = body as { id?: string }
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const post = await db.post.findUnique({ where: { id } })
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Unpin all other posts
  const allPosts = await db.post.findMany({ where: { userId: user.id, isPinned: true } })
  for (const p of allPosts as any[]) {
    if (p.id !== id) {
      await db.post.update({ where: { id: p.id }, data: { isPinned: false } })
    }
  }

  // Toggle pin
  const newPinned = !post.isPinned
  await db.post.update({ where: { id }, data: { isPinned: newPinned } })

  return NextResponse.json({ ok: true, isPinned: newPinned })
}
