import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, validateDateString } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/admin/prompts
 * Returns all prompts (admin only).
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const prompts = await db.prompt.findMany({
    orderBy: { date: 'desc' },
  })

  // Get voiceNote counts separately for each prompt
  const promptIds = prompts.map((p: any) => p.id)
  let voiceNoteCounts: Record<string, number> = {}
  if (promptIds.length > 0) {
    const voiceNotes = await db.voiceNote.findMany({
      where: { promptId: { in: promptIds } },
      select: { promptId: true },
    })
    for (const vn of voiceNotes as any[]) {
      if (vn.promptId) {
        voiceNoteCounts[vn.promptId] = (voiceNoteCounts[vn.promptId] || 0) + 1
      }
    }
  }

  return NextResponse.json({
    prompts: prompts.map((p: any) => ({
      id: p.id,
      text: p.text,
      date: p.date,
      topic: p.topic,
      voiceNotesCount: voiceNoteCounts[p.id] || 0,
    })),
  })
}

/**
 * POST /api/admin/prompts
 * body: { text, date, topic? } — create a new prompt
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  // Rate limit admin actions
  const rateCheck = checkRateLimit(req, 'admin', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }

  const body = await req.json()
  const { text, date, topic } = body as {
    text?: string
    date?: string
    topic?: string
  }

  // Sanitize text
  const cleanText = sanitizeText(text || '', 500)
  if (cleanText.length < 5) {
    return NextResponse.json({ error: 'السؤال قصير جداً' }, { status: 400 })
  }
  
  // Validate date format YYYY-MM-DD
  if (!validateDateString(date || '')) {
    return NextResponse.json({ error: 'صيغة التاريخ غير صحيحة' }, { status: 400 })
  }

  const existing = await db.prompt.findUnique({ where: { date: date! } })
  if (existing) {
    return NextResponse.json({ error: 'فيه سؤال لهذا التاريخ بالفعل' }, { status: 400 })
  }

  const prompt = await db.prompt.create({
    data: {
      text: cleanText,
      date: date!,
      topic: topic ? sanitizeText(topic, 50) : null,
    },
  })

  return NextResponse.json({ prompt })
}

/**
 * PATCH /api/admin/prompts
 * body: { id, text?, topic? }
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const body = await req.json()
  const { id, text, topic } = body as {
    id?: string
    text?: string
    topic?: string
  }

  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  const data: any = {}
  if (typeof text === 'string' && text.trim()) data.text = text.trim().slice(0, 500)
  if (typeof topic === 'string') data.topic = topic.trim().slice(0, 50) || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'مفيش بيانات للتحديث' }, { status: 400 })
  }

  const updated = await db.prompt.update({ where: { id }, data })
  return NextResponse.json({ prompt: updated })
}

/**
 * DELETE /api/admin/prompts?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  await db.prompt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
