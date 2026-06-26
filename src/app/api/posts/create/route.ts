import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS, validateAudioData } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadPostImage } from '@/lib/storage'
import { moderateText } from '@/lib/moderation'
import { moderateWithAI, shouldAutoHide, shouldFlagForReview, shouldWarnUser } from '@/lib/ai-moderation'

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

    // AI Moderation — comprehensive check
    const aiResult = await moderateWithAI(cleanContent)

    if (aiResult.action === 'block' || shouldAutoHide(aiResult)) {
      // Log the violation
      await db.moderationLog.create({
        data: {
          id: generateId(),
          contentType: 'post',
          contentId: 'pending',
          userId: user.id,
          text: cleanContent.slice(0, 2000),
          severity: aiResult.severity,
          categories: aiResult.categories.join(','),
          action: aiResult.action,
          explanation: aiResult.explanation.slice(0, 500),
          model: aiResult.model,
          aiUsed: aiResult.aiUsed,
          status: 'removed',
          createdAt: new Date().toISOString(),
        },
      }).catch(() => {})

      return NextResponse.json(
        {
          error: 'محتواك مخالف لسياسة المنصة',
          reasons: aiResult.categories,
          explanation: aiResult.explanation,
          severity: aiResult.severity,
        },
        { status: 422 }
      )
    }

    data.content = cleanContent

    // If flagged, create a warning for the user
    if (shouldWarnUser(aiResult) || shouldFlagForReview(aiResult)) {
      await db.userWarning.create({
        data: {
          id: generateId(),
          userId: user.id,
          reason: `تحذير تلقائي: ${aiResult.explanation}`,
          category: aiResult.categories[0] || 'policy_violation',
          contentType: 'post',
          contentId: 'pending',
          severity: aiResult.severity,
          isAcknowledged: false,
          createdAt: new Date().toISOString(),
        },
      }).catch(() => {})
    }
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
