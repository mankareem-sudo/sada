import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateEmail, validatePassword } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { hashPassword } from '@/lib/password'
import { logoutAllSessions } from '@/lib/auth'

/**
 * POST /api/auth/reset-password
 * body: { email, code, newPassword }
 * 
 * Resets the user's password using the verified code.
 * Invalidates all existing sessions for security.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 per hour per IP
  const rateCheck = checkRateLimit(req, 'signup')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { email, code, newPassword } = body as {
      email?: string
      code?: string
      newPassword?: string
    }
    
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'بريد إلكتروني غير صحيح' },
        { status: 400 }
      )
    }
    
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'كود غير صحيح' },
        { status: 400 }
      )
    }
    
    // Validate new password strength
    const passwordCheck = validatePassword(newPassword || '')
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.reason },
        { status: 400 }
      )
    }
    
    const normalizedEmail = email.toLowerCase().trim()
    
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (!user || !user.passwordResetCode) {
      return NextResponse.json(
        { error: 'كود غير صحيح' },
        { status: 400 }
      )
    }
    
    // Verify code still matches
    if (user.passwordResetCode !== code) {
      return NextResponse.json(
        { error: 'كود غير صحيح' },
        { status: 400 }
      )
    }
    
    // Check not expired
    if (!user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
      return NextResponse.json(
        { error: 'الكود انتهت صلاحيته' },
        { status: 400 }
      )
    }
    
    // Hash new password
    const passwordHash = hashPassword(newPassword!)
    
    // Update password and clear reset code
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetCode: null,
        passwordResetExpires: null,
      },
    })
    
    // Logout all existing sessions (security: force re-login everywhere)
    await logoutAllSessions(user.id)
    
    return NextResponse.json({
      ok: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    })
  } catch (e) {
    console.error('reset-password error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}
