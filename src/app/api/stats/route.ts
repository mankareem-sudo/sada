import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/stats
 * Returns platform statistics for the landing/auth page.
 */
export async function GET() {
  const [users, voiceNotes, prompts, plays] = await Promise.all([
    db.user.count(),
    db.voiceNote.count(),
    db.prompt.count(),
    db.voiceNote.aggregate({ _sum: { plays: true } }),
  ])

  return NextResponse.json({
    users,
    voiceNotes,
    prompts,
    totalPlays: plays._sum.plays || 0,
  })
}
