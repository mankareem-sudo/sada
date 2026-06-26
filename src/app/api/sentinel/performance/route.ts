import { NextRequest, NextResponse } from 'next/server'
import { measurePerformance } from '@/lib/sentinel'

/**
 * GET /api/sentinel/performance
 *
 * Measures API response times and identifies slow endpoints.
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

    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    const performance = await measurePerformance(baseUrl)

    return NextResponse.json({ performance, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('Performance measurement error', e)
    return NextResponse.json({ error: 'فشل قياس الأداء' }, { status: 500 })
  }
}
