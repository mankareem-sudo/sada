import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * PATCH /api/auth/update-profile
 * body: { name?, bio?, avatarUrl? }
 * 
 * Updates the current user's profile.
 * Avatar is stored as base64 data URI (max 500KB after encoding).
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }
  
  // Rate limit: 10 per hour per user
  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { name, bio, avatarUrl } = body as {
      name?: string
      bio?: string
      avatarUrl?: string | null
    }
    
    const data: any = {}
    
    // Update name
    if (typeof name === 'string') {
      const cleanName = sanitizeText(name, 50)
      if (cleanName.length >= 2) {
        if (detectXSS(cleanName)) {
          return NextResponse.json({ error: 'محتوى غير مسموح في الاسم' }, { status: 400 })
        }
        data.name = cleanName
      }
    }
    
    // Update bio
    if (typeof bio === 'string') {
      const cleanBio = sanitizeText(bio, 200)
      if (detectXSS(cleanBio)) {
        return NextResponse.json({ error: 'محتوى غير مسموح في النبذة' }, { status: 400 })
      }
      data.bio = cleanBio
    }
    
    // Update avatar
    if (avatarUrl !== undefined) {
      if (avatarUrl === null) {
        // Remove avatar
        data.avatarUrl = null
      } else if (typeof avatarUrl === 'string') {
        // Validate avatar (must be data:image/...;base64,...)
        // Max size: 500KB encoded (after client-side compression)
        const MAX_AVATAR_SIZE = 700 * 1024 // 700KB encoded
        
        if (avatarUrl.length > MAX_AVATAR_SIZE) {
          return NextResponse.json(
            { error: 'حجم الصورة كبير جداً (الحد الأقصى 500 كيلوبايت)' },
            { status: 400 }
          )
        }
        
        // Validate format
        const match = avatarUrl.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/)
        if (!match) {
          return NextResponse.json(
            { error: 'صيغة الصورة غير صحيحة (JPEG, PNG, GIF, WebP فقط)' },
            { status: 400 }
          )
        }
        
        data.avatarUrl = avatarUrl
      }
    }
    
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'مفيش بيانات للتحديث' }, { status: 400 })
    }
    
    const updated = await db.user.update({
      where: { id: user.id },
      data,
    })
    
    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        name: updated.name,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
      },
    })
  } catch (e) {
    console.error('update-profile error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}
