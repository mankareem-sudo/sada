import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeedPrompts } from '@/lib/prompts'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/setup
 * One-time setup endpoint that:
 * 1. Verifies database connection
 * 2. Ensures all seed prompts are created
 * 3. Returns connection status
 *
 * Called after deployment to initialize the database.
 * Can be called multiple times safely (idempotent).
 */
export async function POST(req: NextRequest) {
  // Rate limit: very strict (5 per hour per IP)
  const rateCheck = checkRateLimit(req, 'makeAdmin') // reuse strict limit
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || req.headers.get('x-setup-token')
  const expectedToken = process.env.SETUP_TOKEN || 'sada-initial-setup-2026'

  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Pass ?token= or x-setup-token header' },
      { status: 401 }
    )
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  // Step 1: Test DB connection
  try {
    const userCount = await db.user.count()
    results.steps.push({
      step: 'db_connection',
      status: 'ok',
      message: `Database reachable. ${userCount} users.`,
    })
  } catch (e: any) {
    results.steps.push({
      step: 'db_connection',
      status: 'failed',
      message: e?.message || 'Unknown error',
    })
    return NextResponse.json(results, { status: 500 })
  }

  // Step 2: Seed prompts
  try {
    await ensureSeedPrompts()
    const promptCount = await db.prompt.count()
    results.steps.push({
      step: 'seed_prompts',
      status: 'ok',
      message: `${promptCount} prompts available.`,
    })
  } catch (e: any) {
    results.steps.push({
      step: 'seed_prompts',
      status: 'failed',
      message: e?.message || 'Unknown error',
    })
  }

  // Step 3: Stats
  try {
    const [users, voiceNotes, prompts] = await Promise.all([
      db.user.count(),
      db.voiceNote.count(),
      db.prompt.count(),
    ])
    results.stats = { users, voiceNotes, prompts }
    results.steps.push({
      step: 'stats',
      status: 'ok',
      message: `Users: ${users}, VoiceNotes: ${voiceNotes}, Prompts: ${prompts}`,
    })
  } catch (e: any) {
    results.steps.push({
      step: 'stats',
      status: 'failed',
      message: e?.message || 'Unknown error',
    })
  }

  return NextResponse.json(results)
}

/**
 * GET /api/setup
 * Returns setup status (safe to call - just checks connection)
 */
export async function GET() {
  try {
    const userCount = await db.user.count()
    const promptCount = await db.prompt.count()
    return NextResponse.json({
      status: 'ok',
      database: 'reachable',
      users: userCount,
      prompts: promptCount,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        message: e?.message || 'Unknown error',
        hint: 'Make sure prisma db push has been run to create tables',
      },
      { status: 500 }
    )
  }
}
