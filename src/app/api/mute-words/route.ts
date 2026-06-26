import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText } from '@/lib/auth'

/**
 * GET /api/mute-words
 * Returns the current user's muted words.
 *
 * POST /api/mute-words
 * body: { word }
 * Adds a muted word (case-insensitive, max 50 words per user).
 *
 * DELETE /api/mute-words?word=xxx
 * Removes a muted word.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const words = await db.muteWord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      words: (words as any[]).map((w: any) => ({
        id: w.id,
        word: w.word,
        createdAt: w.createdAt,
      })),
    })
  } catch (e) {
    console.error('Mute words fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل الكلمات المكتومة' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { word } = body as { word?: string }

    if (!word || word.trim().length < 2) {
      return NextResponse.json(
        { error: 'الكلمة لازم تكون حرفين على الأقل' },
        { status: 400 }
      )
    }

    const cleanWord = sanitizeText(word.trim().toLowerCase(), 50)

    // Check max 50 words
    const existing = await db.muteWord.findMany({
      where: { userId: user.id },
    })
    if ((existing as any[]).length >= 50) {
      return NextResponse.json(
        { error: 'تقدر تكتم 50 كلمة كحد أقصى' },
        { status: 400 }
      )
    }

    // Check if already exists
    const alreadyExists = (existing as any[]).find(
      (w: any) => w.word.toLowerCase() === cleanWord
    )
    if (alreadyExists) {
      return NextResponse.json({ ok: true, alreadyExists: true })
    }

    const muteWord = await db.muteWord.create({
      data: {
        id: generateId(),
        userId: user.id,
        word: cleanWord,
        createdAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ ok: true, word: muteWord })
  } catch (e) {
    console.error('Mute word add error', e)
    return NextResponse.json({ error: 'فشل إضافة الكلمة' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const url = new URL(req.url)
    const word = url.searchParams.get('word')

    if (!word) {
      return NextResponse.json({ error: 'missing word' }, { status: 400 })
    }

    // Find and delete
    const existing = await db.muteWord.findFirst({
      where: { userId: user.id, word: word.toLowerCase() },
    })

    if (!existing) {
      return NextResponse.json({ error: 'الكلمة مش موجودة' }, { status: 404 })
    }

    await db.muteWord.delete({ where: { id: existing.id } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Mute word delete error', e)
    return NextResponse.json({ error: 'فشل حذف الكلمة' }, { status: 500 })
  }
}
