import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser, sanitizeText, detectXSS } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadCommentImage } from '@/lib/storage'

/**
 * POST /api/messages/send
 * body: { receiverId, content?, imageUrl?, voiceData?, voiceDuration? }
 * Only friends can message each other.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })

  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) return rateCheck.response

  const body = await req.json()
  const { receiverId, content, imageUrl, voiceData, voiceDuration } = body as {
    receiverId?: string
    content?: string
    imageUrl?: string
    voiceData?: string
    voiceDuration?: number
  }

  if (!receiverId || receiverId === user.id) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  if (!content && !imageUrl && !voiceData) {
    return NextResponse.json({ error: 'محتاج محتوى' }, { status: 400 })
  }

  // Check if they're friends
  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: receiverId, status: 'accepted' },
        { requesterId: receiverId, addresseeId: user.id, status: 'accepted' },
      ],
    },
  })

  if (!friendship) {
    return NextResponse.json({ error: 'ممكن تراسل الأصدقاء بس' }, { status: 403 })
  }

  const data: any = {
    id: generateId(),
    senderId: user.id,
    receiverId,
    read: false,
    createdAt: new Date().toISOString(),
  }

  if (content) {
    const clean = sanitizeText(content, 2000)
    if (detectXSS(clean)) return NextResponse.json({ error: 'محتوى غير مسموح' }, { status: 400 })
    data.content = clean
  }

  if (imageUrl && imageUrl.startsWith('data:image/')) {
    const publicUrl = await uploadCommentImage(imageUrl)
    if (publicUrl) data.imageUrl = publicUrl
  }

  if (voiceData && voiceData.startsWith('data:audio/')) {
    data.voiceData = voiceData
    data.voiceDuration = voiceDuration || 0
  }

  const message = await db.message.create({ data })

  // Notify receiver
  await db.notification.create({
    data: {
      id: generateId(),
      recipientId: receiverId,
      actorId: user.id,
      type: 'message',
      text: `بعت ${user.name} رسالة`,
      read: false,
      createdAt: new Date().toISOString(),
    },
  }).catch(() => {})

  return NextResponse.json({ id: message.id, createdAt: message.createdAt })
}
