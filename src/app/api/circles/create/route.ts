import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText } from '@/lib/auth'

/**
 * POST /api/circles/create
 * body: { name, description?, type, rules? }
 *
 * Creates a new Voice Circle (permanent voice group).
 * type: 'public' | 'private' | 'secret'
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, type, rules } = body as {
      name?: string
      description?: string
      type?: string
      rules?: string
    }

    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'اسم الدايرة لازم يكون 3 أحرف على الأقل' },
        { status: 400 }
      )
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: 'اسم الدايرة لازم يكون أقل من 50 حرف' },
        { status: 400 }
      )
    }

    const validType = ['public', 'private', 'secret'].includes(type || '')
      ? type!
      : 'public'

    const CIRCLE_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6']

    // Create circle
    const circle = await db.voiceCircle.create({
      data: {
        id: generateId(),
        name: sanitizeText(name.trim(), 50),
        description: description ? sanitizeText(description, 500) : null,
        ownerId: user.id,
        type: validType,
        rules: rules ? sanitizeText(rules, 1000) : null,
        coverColor: CIRCLE_COLORS[Math.floor(Math.random() * CIRCLE_COLORS.length)],
        membersCount: 1,
        createdAt: new Date().toISOString(),
      },
    })

    // Add owner as first member
    await db.voiceCircleMember.create({
      data: {
        id: generateId(),
        circleId: circle.id,
        userId: user.id,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ circle })
  } catch (e) {
    console.error('Circle create error', e)
    return NextResponse.json({ error: 'فشل إنشاء الدايرة' }, { status: 500 })
  }
}
