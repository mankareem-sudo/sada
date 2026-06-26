import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { pickRandom, pickRandomMany } from '@/lib/egyptian-bots'
import { generateSmartComment, generateSmartReply } from '@/lib/smart-bot-comments'
import { generateSmartPost, generateImageCaption } from '@/lib/smart-bot-posts'

/**
 * POST /api/bots/activate
 * body: { actions?: number }
 *
 * Dynamic bot activity — realistic human-like behavior:
 *
 * Action distribution:
 * - 25% Create text post (AI-generated)
 * - 10% Create image post (AI caption + picsum image)
 * - 15% Like a post
 * - 5%  Like a comment
 * - 15% Comment on a post (AI, relevant to content)
 * - 10% Reply to an existing comment (thread)
 * - 5%  Like a voice note
 * - 5%  Follow a new user
 * - 5%  Bookmark a post
 * - 5%  Send a friend request
 */
export async function POST(req: NextRequest) {
  try {
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
    const maxActions = Math.min(body.actions || 10, 20)

    // Get all bot users
    const botUsers = await db.user.findMany({
      where: { email: { contains: '@sada-bots.local' } },
      take: 250,
    })

    if ((botUsers as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'مفيش بوتات — شغّل /api/bots/seed الأول',
      })
    }

    const stats = {
      textPosts: 0,
      imagePosts: 0,
      postLikes: 0,
      commentLikes: 0,
      comments: 0,
      commentReplies: 0,
      voiceLikes: 0,
      follows: 0,
      bookmarks: 0,
      friendRequests: 0,
      aiContent: 0,
      errors: 0,
    }

    for (let i = 0; i < maxActions; i++) {
      const bot = pickRandom(botUsers as any[])
      const roll = Math.random()

      try {
        if (roll < 0.25) {
          // 25%: Create AI text post
          const { content, usedAI } = await generateSmartPost(bot.name)
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
          stats.textPosts++
          if (usedAI) stats.aiContent++

        } else if (roll < 0.35) {
          // 10%: Create image post with AI caption
          const { caption, imageUrl, usedAI } = await generateImageCaption(bot.name)

          await db.post.create({
            data: {
              id: generateId(),
              userId: bot.id,
              type: 'image',
              content: caption,
              imageUrl,
              privacy: 'public',
              isPublished: true,
              createdAt: new Date().toISOString(),
            },
          })
          stats.imagePosts++
          if (usedAI) stats.aiContent++

        } else if (roll < 0.50) {
          // 15%: Like a post
          const posts = await db.post.findMany({
            where: { isPublished: true },
            take: 50,
            orderBy: { createdAt: 'desc' },
          })
          if ((posts as any[]).length > 0) {
            const post = pickRandom(posts as any[])
            if (post.userId !== bot.id) {
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
                stats.postLikes++

                // Notify post owner
                await db.notification.create({
                  data: {
                    id: generateId(),
                    recipientId: post.userId,
                    actorId: bot.id,
                    type: 'like',
                    text: `${bot.name} عجبه منشورك`,
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                }).catch(() => {})
              }
            }
          }

        } else if (roll < 0.55) {
          // 5%: Like a comment
          const comments = await db.postComment.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
          })
          if ((comments as any[]).length > 0) {
            const comment = pickRandom(comments as any[])
            if (comment.userId !== bot.id) {
              const existing = await db.commentLike.findFirst({
                where: { commentId: comment.id, userId: bot.id },
              })
              if (!existing) {
                await db.commentLike.create({
                  data: {
                    id: generateId(),
                    commentId: comment.id,
                    userId: bot.id,
                    createdAt: new Date().toISOString(),
                  },
                })
                stats.commentLikes++
              }
            }
          }

        } else if (roll < 0.70) {
          // 15%: Comment on a post (AI, relevant)
          const posts = await db.post.findMany({
            where: { isPublished: true },
            take: 50,
            orderBy: { createdAt: 'desc' },
          })
          if ((posts as any[]).length > 0) {
            const post = pickRandom(posts as any[])
            if (post.userId !== bot.id && post.content) {
              const { comment, usedAI } = await generateSmartComment(post.content, bot.name)

              const newComment = await db.postComment.create({
                data: {
                  id: generateId(),
                  postId: post.id,
                  userId: bot.id,
                  content: comment,
                  createdAt: new Date().toISOString(),
                },
              })
              stats.comments++
              if (usedAI) stats.aiContent++

              // Notify post owner
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
            }
          }

        } else if (roll < 0.80) {
          // 10%: Reply to an existing comment (create a thread!)
          const comments = await db.postComment.findMany({
            take: 40,
            orderBy: { createdAt: 'desc' },
          })
          if ((comments as any[]).length > 0) {
            // Find a comment that's not by this bot and has no parentId (top-level)
            const topLevelComments = (comments as any[]).filter(
              (c: any) => c.userId !== bot.id && !c.parentId
            )
            if (topLevelComments.length > 0) {
              const parentComment = pickRandom(topLevelComments)

              // Get the post content for context
              const post = await db.post.findUnique({ where: { id: parentComment.postId } })
              if (post && post.content) {
                const { reply, usedAI } = await generateSmartReply(
                  post.content,
                  parentComment.content,
                  bot.name
                )

                await db.postComment.create({
                  data: {
                    id: generateId(),
                    postId: parentComment.postId,
                    userId: bot.id,
                    content: reply,
                    parentId: parentComment.id,
                    createdAt: new Date().toISOString(),
                  },
                })
                stats.commentReplies++
                if (usedAI) stats.aiContent++

                // Notify the commenter
                await db.notification.create({
                  data: {
                    id: generateId(),
                    recipientId: parentComment.userId,
                    actorId: bot.id,
                    type: 'comment',
                    text: `${bot.name} رد على تعليقك`,
                    read: false,
                    createdAt: new Date().toISOString(),
                  },
                }).catch(() => {})
              }
            }
          }

        } else if (roll < 0.85) {
          // 5%: Like a voice note
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
                stats.voiceLikes++

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

        } else if (roll < 0.90) {
          // 5%: Follow a new user
          const target = pickRandom(botUsers as any[])
          if (target.id !== bot.id) {
            const existing = await db.follow.findFirst({
              where: { followerId: bot.id, followeeId: target.id },
            })
            if (!existing) {
              await db.follow.create({
                data: {
                  id: generateId(),
                  followerId: bot.id,
                  followeeId: target.id,
                  createdAt: new Date().toISOString(),
                },
              })
              stats.follows++

              await db.notification.create({
                data: {
                  id: generateId(),
                  recipientId: target.id,
                  actorId: bot.id,
                  type: 'follow',
                  text: `${bot.name} بدأ يتابعك`,
                  read: false,
                  createdAt: new Date().toISOString(),
                },
              }).catch(() => {})
            }
          }

        } else if (roll < 0.95) {
          // 5%: Bookmark a post
          const posts = await db.post.findMany({
            where: { isPublished: true },
            take: 30,
            orderBy: { createdAt: 'desc' },
          })
          if ((posts as any[]).length > 0) {
            const post = pickRandom(posts as any[])
            if (post.userId !== bot.id) {
              const existing = await db.bookmark.findFirst({
                where: { voiceNoteId: post.id, userId: bot.id },
              })
              if (!existing) {
                await db.bookmark.create({
                  data: {
                    id: generateId(),
                    voiceNoteId: post.id,
                    userId: bot.id,
                    createdAt: new Date().toISOString(),
                  },
                }).catch(() => {})
                stats.bookmarks++
              }
            }
          }

        } else {
          // 5%: Send a friend request
          const target = pickRandom(botUsers as any[])
          if (target.id !== bot.id) {
            const existing1 = await db.friendship.findFirst({
              where: { requesterId: bot.id, addresseeId: target.id },
            })
            const existing2 = await db.friendship.findFirst({
              where: { requesterId: target.id, addresseeId: bot.id },
            })
            if (!existing1 && !existing2) {
              await db.friendship.create({
                data: {
                  id: generateId(),
                  requesterId: bot.id,
                  addresseeId: target.id,
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              })
              stats.friendRequests++

              await db.notification.create({
                data: {
                  id: generateId(),
                  recipientId: target.id,
                  actorId: bot.id,
                  type: 'follow',
                  text: `${bot.name} بعت لك طلب صداقة`,
                  read: false,
                  createdAt: new Date().toISOString(),
                },
              }).catch(() => {})
            }
          }
        }
      } catch (e) {
        stats.errors++
      }

      // Small delay between actions
      await new Promise((r) => setTimeout(r, 200))
    }

    return NextResponse.json({
      success: true,
      actions: maxActions,
      ...stats,
      totalBots: (botUsers as any[]).length,
    })
  } catch (e) {
    console.error('Bot activate error', e)
    return NextResponse.json({ error: 'فشل تفعيل البوتات' }, { status: 500 })
  }
}
