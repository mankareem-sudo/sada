import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadAvatar, deleteFile } from '@/lib/storage'

/**
 * PATCH /api/auth/update-profile
 * body: { name?, bio?, avatarUrl? }
 * 
 * Avatar is uploaded to Supabase Storage (not base64 in DB).
 * Accepts up to 10MB, compressed on client side.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }
  
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
    
    // Update avatar — upload to Storage
    if (avatarUrl !== undefined) {
      if (avatarUrl === null) {
        // Remove avatar
        data.avatarUrl = null
      } else if (typeof avatarUrl === 'string') {
        // Check if it's a data URI (new upload) or already a URL
        if (avatarUrl.startsWith('data:image/')) {
          // Validate size (max 1MB encoded after client compression)
          if (avatarUrl.length > 1.5 * 1024 * 1024) {
            return NextResponse.json(
              { error: 'حجم الصورة كبير جداً' },
              { status: 400 }
            )
          }
          
          // Validate format
          const match = avatarUrl.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/)
          if (!match) {
            return NextResponse.json(
              { error: 'صيغة الصورة غير صحيحة' },
              { status: 400 }
            )
          }
          
          // Upload to Supabase Storage
          const publicUrl = await uploadAvatar(avatarUrl)
          if (!publicUrl) {
            return NextResponse.json(
              { error: 'فشل رفع الصورة' },
              { status: 500 }
            )
          }
          data.avatarUrl = publicUrl
        } else if (avatarUrl.startsWith('http')) {
          // Already a URL (no change needed)
          data.avatarUrl = avatarUrl
        }
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
