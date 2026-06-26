import { NextRequest, NextResponse } from 'next/server'
import { checkHealth } from '@/lib/sentinel'

/**
 * GET /api/sentinel/health
 *
 * Quick health check of all API endpoints.
 * Returns response times + status for each endpoint.
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
    const health = await checkHealth(baseUrl)

    return NextResponse.json({ health, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('Health check error', e)
    return NextResponse.json({ error: 'فشل فحص الصحة' }, { status: 500 })
  }
}
