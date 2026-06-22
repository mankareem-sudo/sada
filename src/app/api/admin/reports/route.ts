import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/admin/reports
 * Returns all pending reports (admin only).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || 'pending'

  const reports = await db.report.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      reporter: true,
      voiceNote: { include: { user: true } },
    },
  })

  return NextResponse.json({
    reports: reports.map((r: any) => ({
      id: r.id,
      reason: r.reason,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
      reporter: r.reporter
        ? {
            id: r.reporter.id,
            name: r.reporter.name,
            username: r.reporter.username,
            avatarColor: r.reporter.avatarColor,
          }
        : null,
      voiceNote: r.voiceNote
        ? {
            id: r.voiceNote.id,
            durationSec: r.voiceNote.durationSec,
            audioData: r.voiceNote.audioData,
            description: r.voiceNote.description,
            createdAt: r.voiceNote.createdAt,
            user: r.voiceNote.user
              ? {
                  id: r.voiceNote.user.id,
                  name: r.voiceNote.user.name,
                  username: r.voiceNote.user.username,
                  avatarColor: r.voiceNote.user.avatarColor,
                }
              : null,
          }
        : null,
    })),
  })
}

/**
 * PATCH /api/admin/reports
 * body: { id, status: 'reviewed' | 'removed' | 'dismissed' }
 * If status is 'removed', also deletes the voice note.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  const body = await req.json()
  const { id, status } = body as {
    id?: string
    status?: 'reviewed' | 'removed' | 'dismissed'
  }

  if (!id || !status) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const report = await db.report.findUnique({
    where: { id },
  }) as any
  if (!report) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  await db.report.update({ where: { id }, data: { status } })

  if (status === 'removed' && report.voiceNoteId) {
    await db.voiceNote.delete({ where: { id: report.voiceNoteId } })
  }

  return NextResponse.json({ ok: true })
}
