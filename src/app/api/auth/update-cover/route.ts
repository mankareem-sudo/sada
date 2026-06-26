import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { uploadPostImage } from '@/lib/storage'

/**
 * POST /api/auth/update-cover
 * body: { coverImage: dataUrl } or { coverUrl: string }
 *
 * Updates the cover photo of the current user.
 * If coverImage is a base64 data URL, it's uploaded to storage first.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { coverImage, coverUrl } = body as {
    coverImage?: string
    coverUrl?: string
  }

  let finalUrl: string | null = null

  if (coverImage && coverImage.startsWith('data:image/')) {
    // Validate
    const match = coverImage.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!match) {
      return NextResponse.json({ error: 'صيغة صورة غير صحيحة' }, { status: 400 })
    }
    if (coverImage.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الصورة كبير جداً (أقصى 5MB)' }, { status: 400 })
    }
    finalUrl = await uploadPostImage(coverImage)
    if (!finalUrl) {
      return NextResponse.json({ error: 'فشل رفع الصورة' }, { status: 500 })
    }
  } else if (coverUrl && coverUrl.startsWith('http')) {
    finalUrl = coverUrl
  } else {
    return NextResponse.json({ error: 'محتاج صورة' }, { status: 400 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { coverUrl: finalUrl },
  })

  return NextResponse.json({
    coverUrl: finalUrl,
  })
}
