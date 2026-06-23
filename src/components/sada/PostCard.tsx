'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { Heart, MessageCircle, MoreHorizontal, Trash2, Send, Image as ImageIcon, Mic, Play, X, Loader2, Share2, Bookmark, Flag } from 'lucide-react'
import { useSada } from '@/lib/store'
import { formatCount, timeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { compressCommentImage } from '@/lib/image-compress'

interface Post {
  id: string
  type: string
  content?: string | null
  imageUrl?: string | null
  voiceNoteId?: string | null
  plays: number
  createdAt: string
  user: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
  } | null
  likedByMe: boolean
  likesCount: number
  commentsCount: number
}

interface Comment {
  id: string
  content?: string | null
  imageUrl?: string | null
  voiceData?: string | null
  voiceDuration?: number | null
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatarColor: string
    avatarUrl?: string | null
  } | null
  replies?: Comment[]
}

export function PostCard({
  post,
  onOpenProfile,
}: {
  post: Post
  onOpenProfile?: (username: string) => void
}) {
  const [liked, setLiked] = useState(post.likedByMe)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentImage, setCommentImage] = useState<string | null>(null)
  const [moreMenu, setMoreMenu] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imageViewer, setImageViewer] = useState<string | null>(null)
  const user = useSada((s) => s.user)

  const toggleLike = async () => {
    if (!user) { toast.error('سجّل دخول الأول'); return }
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount((c) => Math.max(0, c + (newLiked ? 1 : -1)))
    try {
      await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, action: newLiked ? 'like' : 'unlike' }),
      })
    } catch {
      setLiked(!newLiked)
      setLikesCount((c) => Math.max(0, c + (newLiked ? -1 : 1)))
    }
  }

  // Heart animation
  const [heartBurst, setHeartBurst] = useState(false)
  const handleDoubleClick = () => {
    if (!liked) toggleLike()
    setHeartBurst(true)
    setTimeout(() => setHeartBurst(false), 1000)
  }

  const loadComments = useCallback(async () => {
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/posts/comments?postId=${post.id}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {} finally { setLoadingComments(false) }
  }, [post.id])

  useEffect(() => {
    if (showComments && comments.length === 0) loadComments()
  }, [showComments, comments.length, loadComments])

  const submitComment = async () => {
    if (!commentText.trim() && !commentImage) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          content: commentText.trim() || undefined,
          imageUrl: commentImage || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      setComments((prev) => [...prev, data])
      setCommentText('')
      setCommentImage(null)
      toast.success('تم النشر')
    } catch { toast.error('فشل') } finally { setSubmitting(false) }
  }

  const handleCommentImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجا'); return }
    try {
      const compressed = await compressCommentImage(file)
      setCommentImage(compressed)
    } catch { toast.error('فشل تحميل الصورة') }
  }

  const toggleSave = async () => {
    if (!user) { toast.error('سجّل دخول الأول'); return }
    const newSaved = !saved
    setSaved(newSaved)
    try {
      // Use voice-notes bookmark endpoint for now (same concept)
      await fetch('/api/voice-notes/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, action: newSaved ? 'save' : 'unsave' }),
      })
      toast.success(newSaved ? 'اتحفظ' : 'اتشال')
    } catch { setSaved(!newSaved) }
  }

  const sharePost = async () => {
    const url = `${window.location.origin}/?share=${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'صدى', text: post.content?.slice(0, 100) || 'بوست على صدى', url })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('اتنسخ الرابط')
    }
  }

  const deletePost = async () => {
    if (!confirm('متأكد من حذف البوست؟')) return
    try {
      await fetch(`/api/posts/delete?id=${post.id}`, { method: 'DELETE' })
      toast.success('تم الحذف')
      window.location.reload()
    } catch {}
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden sada-glass border-border/50 rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => post.user && onOpenProfile?.(post.user.username)}
              className="flex items-center gap-3 group"
            >
              <Avatar name={post.user?.name || '?'} color={post.user?.avatarColor || '#888'} imageUrl={post.user?.avatarUrl} size="md" />
              <div className="text-right">
                <div className="font-semibold text-sm group-hover:underline">{post.user?.name}</div>
                <div className="text-xs text-muted-foreground">@{post.user?.username} · {timeAgo(post.createdAt)}</div>
              </div>
            </button>
            {user && (
              <div className="relative">
                <button onClick={() => setMoreMenu(v => !v)} className="p-2 hover:bg-muted/60 rounded-full transition">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {moreMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMoreMenu(false)} />
                    <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                      {/* Share */}
                      <button onClick={() => { setMoreMenu(false); sharePost() }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm">
                        <Share2 className="h-4 w-4" /> مشاركة
                      </button>
                      {/* Bookmark */}
                      <button onClick={() => { setMoreMenu(false); toggleSave() }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm">
                        <Bookmark className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} /> {saved ? 'إلغاء الحفظ' : 'حفظ'}
                      </button>
                      {/* Report — only on others' posts */}
                      {user.id !== post.user?.id && (
                        <button onClick={() => { setMoreMenu(false); setReportOpen(true) }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm text-destructive">
                          <Flag className="h-4 w-4" /> إبلاغ
                        </button>
                      )}
                      {/* Delete — only on own posts */}
                      {user.id === post.user?.id && (
                        <button onClick={() => { setMoreMenu(false); deletePost() }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm text-destructive">
                          <Trash2 className="h-4 w-4" /> حذف
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {post.content && (
            <div className="px-4 pb-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          )}

          {/* Image */}
          {post.imageUrl && (
            <div className="relative cursor-pointer" onDoubleClick={handleDoubleClick} onClick={() => setImageViewer(post.imageUrl || null)}>
              <img src={post.imageUrl} alt="Post" className="w-full max-h-[600px] object-cover" />
              <AnimatePresence>
                {heartBurst && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    exit={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Heart className="h-24 w-24 text-white fill-white drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border/30">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={toggleLike}
              className="flex items-center gap-1.5 text-sm transition"
            >
              <motion.div animate={liked ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
                <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
              </motion.div>
              <span className={`tabular-nums ${liked ? 'text-red-500' : 'text-muted-foreground'}`}>{formatCount(likesCount)}</span>
            </motion.button>

            <button onClick={() => setShowComments(v => !v)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              <MessageCircle className="h-5 w-5" />
              <span className="tabular-nums">{formatCount(post.commentsCount)}</span>
            </button>
          </div>

          {/* Comments */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border/30 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {/* Comment input */}
                  {user && (
                    <div className="flex gap-2 items-start">
                      <Avatar name={user.name} color={user.avatarColor} imageUrl={user.avatarUrl} size="sm" />
                      <div className="flex-1 space-y-2">
                        {commentImage && (
                          <div className="relative inline-block">
                            <img src={commentImage} alt="Comment" className="max-h-32 rounded-lg" />
                            <button onClick={() => setCommentImage(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="اكتب تعليق..."
                            className="flex-1 bg-muted/40 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            onKeyPress={(e) => e.key === 'Enter' && submitComment()}
                          />
                          <label className="cursor-pointer p-2 hover:bg-muted/40 rounded-full transition">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <input type="file" accept="image/*" onChange={handleCommentImage} className="hidden" />
                          </label>
                          <Button size="sm" onClick={submitComment} disabled={submitting || (!commentText.trim() && !commentImage)} className="rounded-full h-9 w-9 p-0">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments list */}
                  {loadingComments ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">مفيش تعليقات لسه</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2 items-start">
                          <Avatar name={c.user?.name || '?'} color={c.user?.avatarColor || '#888'} imageUrl={c.user?.avatarUrl} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted/40 rounded-2xl px-3 py-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-sm">{c.user?.name}</span>
                                <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                              </div>
                              {c.content && <p className="text-sm whitespace-pre-wrap">{c.content}</p>}
                            </div>
                            {c.imageUrl && <img src={c.imageUrl} alt="Comment" className="mt-1 max-h-40 rounded-lg" />}
                            {c.voiceData && <VoicePlayer src={c.voiceData} durationSec={c.voiceDuration || 0} className="mt-1" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Image viewer */}
      <AnimatePresence>
        {imageViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setImageViewer(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <img src={imageViewer} alt="Full" className="max-w-full max-h-full rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
