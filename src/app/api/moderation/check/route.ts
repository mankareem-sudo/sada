import { NextRequest, NextResponse } from 'next/server'
import { moderateText } from '@/lib/moderation'

/**
 * POST /api/moderation/check
 * body: { text }
 *
 * Checks text for toxic content.
 * Returns: { isToxic, score, reasons, action, flaggedWords }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text } = body as { text?: string }

    if (!text) {
      return NextResponse.json({ error: 'missing text' }, { status: 400 })
    }

    const result = moderateText(text)

    return NextResponse.json(result)
  } catch (e) {
    console.error('Moderation check error', e)
    return NextResponse.json({ error: 'فشل الفحص' }, { status: 500 })
  }
}
