import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateEmail, sanitizeText } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'

/**
 * POST /api/auth/forgot-password
 * body: { email: string }
 * 
 * Generates a 6-digit code, stores it in the user's record with 15-min expiry,
 * and sends it to the user's email via the AI email service.
 * 
 * Security: Always returns 200 even if email doesn't exist (prevents enumeration).
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 per hour per IP
  const rateCheck = checkRateLimit(req, 'signup') // reuse signup limit
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { email } = body as { email?: string }
    
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'بريد إلكتروني غير صحيح' },
        { status: 400 }
      )
    }
    
    const normalizedEmail = email.toLowerCase().trim()
    
    // Find user (but don't reveal if they exist)
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })
    
    // Always return success to prevent enumeration
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: 'لو الإيميل مسجل، هتلاقي كود في البريد',
      })
    }
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min
    
    // Store code in user record
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: code,
        passwordResetExpires: expiresAt,
      },
    })
    
    // Send email
    try {
      await sendPasswordResetEmail(user.email, code, user.name)
    } catch (e) {
      console.error('Failed to send reset email:', e)
      // Don't reveal the error to user
    }
    
    return NextResponse.json({
      ok: true,
      message: 'لو الإيميل مسجل، هتلاقي كود في البريد',
    })
  } catch (e) {
    console.error('forgot-password error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}
