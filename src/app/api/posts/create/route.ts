import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS, validateAudioData } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/posts/create
 * body: { type: 'text'|'image'|'voice', content?, imageUrl?, voiceNoteId? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const rateCheck = checkRateLimit(req, 'voiceNoteCreate', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { type, content, imageUrl, voiceNoteId } = body as {
    type?: string
    content?: string
    imageUrl?: string
    voiceNoteId?: string
  }

  if (!type || !['text', 'image', 'voice'].includes(type)) {
    return NextResponse.json({ error: 'نوع البوست غير صحيح' }, { status: 400 })
  }

  const data: any = {
    id: generateId(),
    userId: user.id,
    type,
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

  // Image (base64, max 2MB after compression on client)
  if (imageUrl) {
    const match = imageUrl.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!match) {
      return NextResponse.json({ error: 'صيغة الصورة غير صحيحة' }, { status: 400 })
    }
    if (imageUrl.length > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الصورة كبير جداً' }, { status: 400 })
    }
    data.imageUrl = imageUrl
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
