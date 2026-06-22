import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateReportReason, sanitizeText } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/voice-notes/report
 * body: { voiceNoteId: string, reason: string, comment?: string }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  // Rate limit: 5 reports per hour per user
  const rateCheck = checkRateLimit(req, 'report', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }

  const body = await req.json()
  const { voiceNoteId, reason, comment } = body as {
    voiceNoteId?: string
    reason?: string
    comment?: string
  }

  if (!voiceNoteId || !validateReportReason(reason || '')) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  const note = await db.voiceNote.findUnique({ where: { id: voiceNoteId } })
  if (!note) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  // Prevent duplicate reports from the same user
  const existing = await db.report.findFirst({
    where: { reporterId: user.id, voiceNoteId },
  })
  if (existing) {
    return NextResponse.json({ ok: true, alreadyReported: true })
  }

  await db.report.create({
    data: {
      reporterId: user.id,
      voiceNoteId,
      reason,
      comment: comment ? sanitizeText(comment, 500) : null,
    },
  })

  const pendingCount = await db.report.count({
    where: { voiceNoteId, status: 'pending' },
  })

  return NextResponse.json({ ok: true, pendingCount })
}
