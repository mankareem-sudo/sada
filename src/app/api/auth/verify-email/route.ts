import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/email'
import { db as _db } from '@/lib/db'

// We'll reuse the passwordResetCode/passwordResetExpires columns for email verification
// (to avoid adding yet another column)

/**
 * POST /api/auth/verify-email/send
 * Sends a 6-digit verification code to the logged-in user's email.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const rateCheck = checkRateLimit(req, 'signup', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  // Generate code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  await db.user.update({
    where: { id: user.id },
    data: { passwordResetCode: code, passwordResetExpires: expiresAt },
  })

  try {
    await sendVerificationEmail(user.email, code, user.name)
  } catch (e) {
    console.error('Failed to send verification email:', e)
  }

  return NextResponse.json({ ok: true, message: 'تم إرسال كود التحقق لإيميلك' })
}

/**
 * POST /api/auth/verify-email/verify
 * body: { code }
 * Verifies the code and marks email as verified.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const body = await req.json()
  const { code } = body as { code?: string }

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'الكود لازم يكون 6 أرقام' }, { status: 400 })
  }

  const fullUser = await db.user.findUnique({ where: { id: user.id } })
  if (!fullUser || !fullUser.passwordResetCode) {
    return NextResponse.json({ error: 'مفيش كود مرسل' }, { status: 400 })
  }

  if (fullUser.passwordResetCode !== code) {
    return NextResponse.json({ error: 'كود غير صحيح' }, { status: 400 })
  }

  if (fullUser.passwordResetExpires && new Date(fullUser.passwordResetExpires) < new Date()) {
    return NextResponse.json({ error: 'الكود انتهت صلاحيته' }, { status: 400 })
  }

  // Set emailVerified = true and clear the code
  await db.user.update({
    where: { id: user.id },
    data: { passwordResetCode: null, passwordResetExpires: null, emailVerified: true },
  })

  return NextResponse.json({ ok: true, message: 'تم تأكيد البريد الإلكتروني ✅' })
}
