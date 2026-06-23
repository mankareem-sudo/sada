import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validatePassword } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { hashPassword, verifyPassword } from '@/lib/password'

/**
 * POST /api/auth/change-password
 * body: { currentPassword, newPassword }
 * 
 * Changes password for logged-in user.
 * Requires current password to be correct.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }
  
  // Rate limit: 3 per hour per user
  const rateCheck = checkRateLimit(req, 'signup', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body as {
      currentPassword?: string
      newPassword?: string
    }
    
    // Validate current password
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور الحالية مطلوبة' },
        { status: 400 }
      )
    }
    
    // Get user with passwordHash
    const userWithHash = await db.user.findUnique({
      where: { id: user.id },
    })
    
    if (!userWithHash || !userWithHash.passwordHash) {
      return NextResponse.json(
        { error: 'حسابك مش متصل بكلمة مرور' },
        { status: 400 }
      )
    }
    
    // Verify current password
    const ok = verifyPassword(currentPassword, userWithHash.passwordHash)
    if (!ok) {
      return NextResponse.json(
        { error: 'كلمة المرور الحالية غير صحيحة' },
        { status: 400 }
      )
    }
    
    // Validate new password
    const passwordCheck = validatePassword(newPassword || '')
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.reason },
        { status: 400 }
      )
    }
    
    // Check new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور الجديدة لازم تكون مختلفة' },
        { status: 400 }
      )
    }
    
    // Hash new password
    const passwordHash = hashPassword(newPassword!)
    
    // Update
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })
    
    return NextResponse.json({
      ok: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    })
  } catch (e) {
    console.error('change-password error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}
