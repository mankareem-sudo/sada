import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateEmail } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/auth/verify-reset-code
 * body: { email, code }
 * 
 * Verifies the reset code is correct and not expired.
 * Returns a temporary reset token (valid for 5 min) to use in the reset-password step.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 5 per hour per IP
  const rateCheck = checkRateLimit(req, 'auth')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { email, code } = body as { email?: string; code?: string }
    
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'بريد إلكتروني غير صحيح' },
        { status: 400 }
      )
    }
    
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'الكود لازم يكون 6 أرقام' },
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
    
    // Check code matches
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
    
    // Generate a temporary reset token (valid for 5 min)
    // This token is the code itself, but we extend its validity
    const newExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 min for password reset
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetExpires: newExpiry,
      },
    })
    
    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      code: code, // Return code as the reset token
    })
  } catch (e) {
    console.error('verify-reset-code error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}
