import { NextRequest, NextResponse } from 'next/server'
import { analyzeCodebase } from '@/lib/sentinel'

/**
 * GET /api/sentinel/codebase
 *
 * Analyzes the codebase for code smells, tech debt, and gaps.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const internalToken = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'
    if (authHeader !== `Bearer ${internalToken}`) {
      const { getCurrentUser } = await import('@/lib/auth')
      const user = await getCurrentUser()
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
      }
    }

    const codebase = await analyzeCodebase()

    return NextResponse.json({ codebase, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('Codebase analysis error', e)
    return NextResponse.json({ error: 'فشل تحليل الكود' }, { status: 500 })
  }
}
