import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS, validateAudioData } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadPostImage } from '@/lib/storage'

/**
 * POST /api/posts/create
 * body: { type: 'text'|'image'|'voice', content?, imageUrl?, voiceNoteId? }
 * Images are uploaded to Supabase Storage (not base64 in DB).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const rateCheck = checkRateLimit(req, 'voiceNoteCreate', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { type, content, imageUrl, voiceNoteId, privacy, scheduledAt } = body as {
    type?: string
    content?: string
    imageUrl?: string
    voiceNoteId?: string
    privacy?: string
    scheduledAt?: string
  }

  if (!type || !['text', 'image', 'voice'].includes(type)) {
    return NextResponse.json({ error: 'نوع البوست غير صحيح' }, { status: 400 })
  }

  // Validate privacy
  const validPrivacy = ['public', 'friends', 'private'].includes(privacy || '') 
    ? privacy! : 'public'

  // Extract hashtags from content
  let hashtags: string | null = null
  if (content) {
    const tags = content.match(/#[\u0600-\u06FFa-zA-Z0-9_]+/g)
    if (tags && tags.length > 0) {
      hashtags = tags.map(t => t.slice(1).toLowerCase()).join(',')
    }
  }

  const data: any = {
    id: generateId(),
    userId: user.id,
    type,
    privacy: validPrivacy,
    hashtags,
    scheduledAt: scheduledAt || null,
    isPublished: !scheduledAt,
    createdAt: new Date().toISOString(),
  }

  // Text content
  if (content) {
    const cleanContent = sanitizeText(content, 2000)
    if (detectXSS(cleanContent)) {
      return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })
    }
    data.content = cleanContent
  }

  // Image — upload to Storage
  if (imageUrl) {
    if (imageUrl.startsWith('data:image/')) {
      const match = imageUrl.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/)
      if (!match) {
        return NextResponse.json({ error: 'صيغة الصورة غير صحيحة' }, { status: 400 })
      }
      if (imageUrl.length > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'حجم الصورة كبير جداً' }, { status: 400 })
      }
      
      // Upload to Supabase Storage
      const publicUrl = await uploadPostImage(imageUrl)
      if (!publicUrl) {
        return NextResponse.json({ error: 'فشل رفع الصورة' }, { status: 500 })
      }
      data.imageUrl = publicUrl
    } else if (imageUrl.startsWith('http')) {
      data.imageUrl = imageUrl
    }
  }

  // Voice note reference
  if (voiceNoteId) {
    data.voiceNoteId = voiceNoteId
  }

  // Require at least some content
  if (!data.content && !data.imageUrl && !data.voiceNoteId) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  const post = await db.post.create({ data })
  return NextResponse.json({ id: post.id, createdAt: post.createdAt })
}
