import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const VALID_INTERESTS = [
  'tech',
  'design',
  'business',
  'learning',
  'health',
  'creativity',
  'culture',
  'life',
]

/**
 * POST /api/onboarding
 * body: { interests: string[] }
 * Marks the user as onboarded.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { interests } = body as { interests?: string[] }

  if (!Array.isArray(interests) || interests.length === 0) {
    return NextResponse.json(
      { error: 'اختار اهتمام واحد على الأقل' },
      { status: 400 }
    )
  }

  const cleanInterests = interests
    .filter((i) => VALID_INTERESTS.includes(i))
    .slice(0, 8)

  if (cleanInterests.length === 0) {
    return NextResponse.json(
      { error: 'بيانات غير صحيحة' },
      { status: 400 }
    )
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      interests: cleanInterests.join(','),
      onboarded: true,
    },
  })

  return NextResponse.json({
    user: {
      id: updated.id,
      username: updated.username,
      name: updated.name,
      onboarded: updated.onboarded,
      interests: updated.interests,
    },
  })
}
