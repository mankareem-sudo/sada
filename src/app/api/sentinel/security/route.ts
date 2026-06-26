import { NextRequest, NextResponse } from 'next/server'
import { auditSecurity } from '@/lib/sentinel'

/**
 * GET /api/sentinel/security
 *
 * Runs security audit on the platform.
 * Checks for: missing secrets, CSP, auth bypass, XSS risks.
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

    const security = await auditSecurity()

    return NextResponse.json({ security, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('Security audit error', e)
    return NextResponse.json({ error: 'فشل التدقيق الأمني' }, { status: 500 })
  }
}
