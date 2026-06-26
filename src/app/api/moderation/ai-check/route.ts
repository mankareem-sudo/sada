import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { moderateWithAI } from '@/lib/ai-moderation'

/**
 * POST /api/moderation/ai-check
 * body: { text, contentType?, contentId? }
 *
 * Runs AI moderation on text content.
 * Returns the full moderation result.
 *
 * If contentType + contentId are provided, logs the result to ModerationLog table.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { text, contentType, contentId } = body as {
      text?: string
      contentType?: 'post' | 'comment' | 'voice_note' | 'message' | 'profile'
      contentId?: string
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'missing text' }, { status: 400 })
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'النص طويل جداً (max 5000 chars)' }, { status: 400 })
    }

    const result = await moderateWithAI(text)

    // Log the moderation result if context is provided
    if (contentType && contentId) {
      try {
        const { db, generateId } = await import('@/lib/db')
        await db.moderationLog.create({
          data: {
            id: generateId(),
            contentType,
            contentId,
            userId: user.id,
            text: text.slice(0, 2000), // Truncate for storage
            severity: result.severity,
            categories: result.categories.join(','),
            action: result.action,
            explanation: result.explanation.slice(0, 500),
            model: result.model,
            aiUsed: result.aiUsed,
            status: result.action === 'block' ? 'pending' : (result.action === 'flag' ? 'pending' : 'approved'),
            createdAt: new Date().toISOString(),
          },
        })
      } catch (e) {
        console.warn('Failed to log moderation result', e)
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('AI moderation check error', e)
    return NextResponse.json({ error: 'فشل الفحص' }, { status: 500 })
  }
}
