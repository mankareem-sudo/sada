import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS, validateAudioData } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadPostImage } from '@/lib/storage'
import { moderateText } from '@/lib/moderation'
import { moderateWithAI, shouldAutoHide, shouldFlagForReview, shouldWarnUser } from '@/lib/ai-moderation'
import { checkUserStrikeStatus } from '@/lib/strike'

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

  // === Strike system check — block posting if user is muted or banned ===
  const strikeStatus = await checkUserStrikeStatus(user.id)
  if (strikeStatus.currentPenalty === 'ban') {
    const endsAt = strikeStatus.penaltyEndsAt
      ? new Date(strikeStatus.penaltyEndsAt).toLocaleString('ar-EG')
      : 'دائم'
    return NextResponse.json({
      error: `تم حظر حسابك حتى: ${endsAt}`,
      penalty: 'ban',
      penaltyEndsAt: strikeStatus.penaltyEndsAt,
    }, { status: 403 })
  }
  if (strikeStatus.currentPenalty === 'mute') {
    const endsAt = strikeStatus.penaltyEndsAt
      ? new Date(strikeStatus.penaltyEndsAt).toLocaleString('ar-EG')
      : ''
    return NextResponse.json({
      error: `تم كتم حسابك حتى: ${endsAt}. لا يمكنك النشر حالياً`,
      penalty: 'mute',
      penaltyEndsAt: strikeStatus.penaltyEndsAt,
    }, { status: 403 })
  }

  const rateCheck = checkRateLimit(req, 'voiceNoteCreate', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { type, content, imageUrl, voiceNoteId, privacy, scheduledAt,
          linkPreview, pollQuestion, pollOptions, pollAllowMultiple, pollDurationHours } = body as {
    type?: string
    content?: string
    imageUrl?: string
    voiceNoteId?: string
    privacy?: string
    scheduledAt?: string
    linkPreview?: { url: string; title?: string; description?: string; image?: string; siteName?: string }
    pollQuestion?: string
    pollOptions?: string[]
    pollAllowMultiple?: boolean
    pollDurationHours?: number
  }

  if (!type || !['text', 'image', 'voice', 'link', 'poll'].includes(type)) {
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

  // === Link preview ===
  if (type === 'link' && linkPreview?.url) {
    data.linkUrl = linkPreview.url
    data.linkTitle = linkPreview.title || null
    data.linkDescription = linkPreview.description || null
    data.linkImage = linkPreview.image || null
    data.linkFetchedAt = new Date().toISOString()
  }

  // === Poll ===
  if (type === 'poll') {
    if (!pollQuestion || !pollOptions || pollOptions.length < 2 || pollOptions.length > 6) {
      return NextResponse.json({ error: 'الاستطلاع يحتاج سؤال وخيارين على الأقل (أقصى 6)' }, { status: 400 })
    }
    const cleanQ = sanitizeText(pollQuestion, 200)
    if (detectXSS(cleanQ)) {
      return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })
    }
    data.pollQuestion = cleanQ
    // Store options as JSON: [{id, text}]
    const opts = pollOptions.slice(0, 6).map((text, i) => ({
      id: `opt_${i}_${Date.now().toString(36)}`,
      text: sanitizeText(text, 80),
    }))
    data.pollOptions = JSON.stringify(opts)
    data.pollAllowMultiple = !!pollAllowMultiple
    if (pollDurationHours && pollDurationHours > 0 && pollDurationHours <= 24 * 30) {
      const expires = new Date(Date.now() + pollDurationHours * 3600 * 1000)
      data.pollExpiresAt = expires.toISOString()
    }
  }

  // Require at least some content
  if (!data.content && !data.imageUrl && !data.voiceNoteId && !data.linkUrl && !data.pollQuestion) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  const post = await db.post.create({ data })
  return NextResponse.json({ id: post.id, createdAt: post.createdAt })
}
