import { NextRequest, NextResponse } from 'next/server'
import { checkDependencies } from '@/lib/sentinel'

/**
 * GET /api/sentinel/dependencies
 *
 * Checks for outdated/vulnerable npm packages.
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

    const dependencies = await checkDependencies()

    return NextResponse.json({ dependencies, timestamp: new Date().toISOString() })
  } catch (e) {
    console.error('Dependency check error', e)
    return NextResponse.json({ error: 'فشل فحص الحزم' }, { status: 500 })
  }
}
