import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, logout } from '@/lib/auth'

/**
 * POST /api/account/delete
 * body: { confirm: string } — must equal "DELETE"
 * Deletes the user's account and all related data.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { confirm } = body as { confirm?: string }
  if (confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'تأكيد غير صحيح. اكتب DELETE للتأكيد.' },
      { status: 400 }
    )
  }

  await db.user.delete({ where: { id: user.id } })
  await logout()

  return NextResponse.json({ ok: true })
}
