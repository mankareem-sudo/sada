import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/posts/react
 * body: { postId, type }
 *
 * Toggles an emotional reaction on a post.
 * Types: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
 *
 * If user already has a reaction of the same type → removes it (toggle off)
 * If user has a different reaction → replaces it
 * If no reaction → creates new one
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, type } = body as { postId?: string; type?: string }

    if (!postId) {
      return NextResponse.json({ error: 'missing postId' }, { status: 400 })
    }

    const validTypes = ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: 'نوع تفاعل غير صحيح' }, { status: 400 })
    }

    // Check if user already reacted to this post
    const existing = await db.postReaction.findFirst({
      where: { postId, userId: user.id },
    })

    if (existing) {
      if (existing.type === type) {
        // Same type → toggle off (remove)
        await db.postReaction.delete({ where: { id: existing.id } })
        return NextResponse.json({ reacted: false, type: null })
      } else {
        // Different type → replace
        await db.postReaction.update({
          where: { id: existing.id },
          data: { type },
        })
        return NextResponse.json({ reacted: true, type })
      }
    }

    // No existing reaction → create new
    await db.postReaction.create({
      data: {
        id: generateId(),
        postId,
        userId: user.id,
        type,
        createdAt: new Date().toISOString(),
      },
    })

    // Notify post owner
    const post = await db.post.findUnique({ where: { id: postId } })
    if (post && post.userId !== user.id) {
      const reactionLabels: Record<string, string> = {
        like: 'أعجب بمنشورك',
        love: 'أحب منشورك',
        laugh: 'ضحك على منشورك',
        wow: 'تفاجأ من منشورك',
        sad: 'حزن من منشورك',
        angry: 'غضب من منشورك',
      }
      await db.notification.create({
        data: {
          id: generateId(),
          recipientId: post.userId,
          actorId: user.id,
          type: 'like',
          text: `${user.name} ${reactionLabels[type] || 'تفاعل مع منشورك'}`,
          read: false,
          createdAt: new Date().toISOString(),
        },
      }).catch(() => {})
    }

    return NextResponse.json({ reacted: true, type })
  } catch (e) {
    console.error('Reaction error', e)
    return NextResponse.json({ error: 'فشل التفاعل' }, { status: 500 })
  }
}
