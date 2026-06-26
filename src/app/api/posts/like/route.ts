import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/posts/like
 * body: { id, action: 'like' | 'unlike' }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const rateCheck = checkRateLimit(req, 'like', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { id, action } = body as { id?: string; action?: 'like' | 'unlike' }
  if (!id || !action || !['like', 'unlike'].includes(action)) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  if (action === 'like') {
    try {
      await db.postLike.create({ data: { id: `pl_${Date.now()}_${Math.random().toString(36).slice(2)}`, userId: user.id, postId: id, createdAt: new Date().toISOString() } })
    } catch {}
  } else {
    await db.postLike.deleteMany({ where: { userId: user.id, postId: id } })
  }

  const likesCount = await db.postLike.count({ where: { postId: id } })
  return NextResponse.json({ liked: action === 'like', likesCount })
}
