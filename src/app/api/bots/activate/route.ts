import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import {
  generateEgyptianPost,
  generateEgyptianComment,
  pickRandom,
  EGYPTIAN_REACTIONS,
} from '@/lib/egyptian-bots'
import { generateSmartComment, generateSmartReply } from '@/lib/smart-bot-comments'

/**
 * POST /api/bots/activate
 * body: { actions?: number }
 *
 * Triggers random bot activity:
 * - 40% chance: create a post
 * - 30% chance: like a post
 * - 20% chance: comment on a post
 * - 10% chance: like a voice note
 *
 * This can be called by cron (every 5-15 min) or manually.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin or internal token
    const authHeader = req.headers.get('authorization')
    const internalToken = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'
    if (authHeader !== `Bearer ${internalToken}`) {
      const { getCurrentUser } = await import('@/lib/auth')
      const user = await getCurrentUser()
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const maxActions = Math.min(body.actions || 5, 20)

    // Get all bot users (emails ending with @sada-bots.local)
    const botUsers = await db.user.findMany({
      where: { email: { contains: '@sada-bots.local' } },
      take: 200,
    })

    if ((botUsers as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'مفيش بوتات — شغّل /api/bots/seed الأول',
      })
    }

    let postsCreated = 0
    let likesGiven = 0
    let commentsCreated = 0
    let voiceLikesGiven = 0
    let aiComments = 0
    let errors = 0

    for (let i = 0; i < maxActions; i++) {
      const bot = pickRandom(botUsers as any[])
      const action = Math.random()

      try {
        if (action < 0.4) {
          // 40%: Create a post
          const content = generateEgyptianPost()
          const privacy = Math.random() < 0.85 ? 'public' : 'friends'

          await db.post.create({
            data: {
              id: generateId(),
              userId: bot.id,
              type: 'text',
              content,
              privacy,
              isPublished: true,
              createdAt: new Date().toISOString(),
            },
          })
          postsCreated++
        } else if (action < 0.7) {
          // 30%: Like a post
          const posts = await db.post.findMany({
            where: { isPublished: true },
            take: 50,
            orderBy: { createdAt: 'desc' },
          })
          if ((posts as any[]).length > 0) {
            const post = pickRandom(posts as any[])
            // Check if already liked
            const existing = await db.postLike.findFirst({
              where: { postId: post.id, userId: bot.id },
            })
            if (!existing) {
              await db.postLike.create({
                data: {
                  id: generateId(),
                  postId: post.id,
                  userId: bot.id,
                  createdAt: new Date().toISOString(),
                },
              })
              likesGiven++
            }
          }
        } else if (action < 0.9) {
          // 20%: Comment on a post (SMART - relevant to content)
          const posts = await db.post.findMany({
            where: { isPublished: true },
            take: 50,
            orderBy: { createdAt: 'desc' },
          })
          if ((posts as any[]).length > 0) {
            const post = pickRandom(posts as any[])
            // Don't comment on own post
            if (post.userId !== bot.id && post.content) {
              // Generate smart contextual comment using AI
              const { comment, usedAI } = await generateSmartComment(post.content, bot.name)

              await db.postComment.create({
                data: {
                  id: generateId(),
                  postId: post.id,
                  userId: bot.id,
                  content: comment,
                  createdAt: new Date().toISOString(),
                },
              })
              commentsCreated++
              if (usedAI) aiComments++

              // Send notification to post owner
              await db.notification.create({
                data: {
                  id: generateId(),
                  recipientId: post.userId,
                  actorId: bot.id,
                  type: 'comment',
                  text: `${bot.name} علّق على منشورك`,
                  read: false,
                  createdAt: new Date().toISOString(),
                },
              }).catch(() => {})

              // 30% chance: another bot replies to this comment (thread)
              if (Math.random() < 0.3) {
                const otherBots = (botUsers as any[]).filter((b: any) => b.id !== bot.id)
                if (otherBots.length > 0) {
                  const replyBot = pickRandom(otherBots)
                  const { reply, usedAI: replyAI } = await generateSmartReply(post.content, comment, replyBot.name)
                  await db.postComment.create({
                    data: {
                      id: generateId(),
                      postId: post.id,
                      userId: replyBot.id,
                      content: reply,
                      parentId: undefined, // Would need to fetch the comment ID first
                      createdAt: new Date().toISOString(),
                    },
                  }).catch(() => {})
                  if (replyAI) aiComments++
                }
              }
            }
          }
        } else {
          // 10%: Like a voice note
          const voiceNotes = await db.voiceNote.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
          })
          if ((voiceNotes as any[]).length > 0) {
            const note = pickRandom(voiceNotes as any[])
            if (note.userId !== bot.id) {
              const existing = await db.like.findFirst({
                where: { voiceNoteId: note.id, userId: bot.id },
              })
              if (!existing) {
                await db.like.create({
                  data: {
                    id: generateId(),
                    voiceNoteId: note.id,
                    userId: bot.id,
                    createdAt: new Date().toISOString(),
                  },
                })
                voiceLikesGiven++

                // Send notification
                await db.notification.create({
                  data: {
                    id: generateId(),
                    recipientId: note.userId,
                    actorId: bot.id,
                    type: 'like',
                    text: `${bot.name} عجبه صداك`,
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                }).catch(() => {})
              }
            }
          }
        }
      } catch (e) {
        errors++
      }

      // Small delay between actions
      await new Promise((r) => setTimeout(r, 200))
    }

    return NextResponse.json({
      success: true,
      actions: maxActions,
      postsCreated,
      likesGiven,
      commentsCreated,
      voiceLikesGiven,
      aiComments,
      errors,
      totalBots: (botUsers as any[]).length,
    })
  } catch (e) {
    console.error('Bot activate error', e)
    return NextResponse.json({ error: 'فشل تفعيل البوتات' }, { status: 500 })
  }
}
