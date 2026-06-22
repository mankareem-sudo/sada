import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/admin/stats
 * Returns high-level platform stats (admin only).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
  }

  // Rate limit admin actions
  const rateCheck = checkRateLimit(req as any, 'admin', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }

  const [
    users,
    voiceNotes,
    prompts,
    comments,
    likes,
    bookmarks,
    reports,
    pendingReports,
    follows,
    donations,
    donationSum,
  ] = await Promise.all([
    db.user.count(),
    db.voiceNote.count(),
    db.prompt.count(),
    db.comment.count(),
    db.like.count(),
    db.bookmark.count(),
    db.report.count(),
    db.report.count({ where: { status: 'pending' } }),
    db.follow.count(),
    db.supportDonation.count(),
    db.supportDonation.aggregate({ _sum: { amount: true } }),
  ])

  // Voice notes in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const activeThisWeek = await db.voiceNote.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    distinct: ['userId'],
    select: { userId: true },
  })

  return NextResponse.json({
    users,
    voiceNotes,
    prompts,
    comments,
    likes,
    bookmarks,
    reports,
    pendingReports,
    follows,
    donations,
    totalDonations: donationSum._sum.amount || 0,
    activeThisWeek: activeThisWeek.length,
  })
}
