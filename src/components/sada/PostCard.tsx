'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { Heart, MessageCircle, MoreHorizontal, Trash2, Send, Image as ImageIcon, Mic, Play, X, Loader2, Share2, Bookmark, Flag, Pencil, Pin, Ban, Globe, Lock, Users, ThumbsUp } from 'lucide-react'
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
  privacy?: 'public' | 'friends' | 'private' | string | null
  plays: number
  createdAt: string
  user: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
    isVerified?: boolean
  } | null
  likedByMe: boolean
  likesCount: number
  commentsCount: number
  myReaction?: string | null
  reactions?: Record<string, number>
  reactionsCount?: number
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
  const [myReaction, setMyReaction] = useState<string | null>((post as any).myReaction || null)
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState<Record<string, number>>((post as any).reactions || {})
  const [reactionsCount, setReactionsCount] = useState((post as any).reactionsCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentImage, setCommentImage] = useState<string | null>(null)
  const [commentVoice, setCommentVoice] = useState<string | null>(null)
  const [recordingComment, setRecordingComment] = useState(false)
  const [commentRecorder, setCommentRecorder] = useState<MediaRecorder | null>(null)
  const [moreMenu, setMoreMenu] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(false)
  const [editText, setEditText] = useState(post.content || '')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imageViewer, setImageViewer] = useState<string | null>(null)
  const user = useSada((s) => s.user)

  const toggleLike = async () => {
    if (!user) { toast.error('سجّل دخول الأول'); return }
    // If already has a reaction, remove it; otherwise add 'like'
    if (myReaction) {
      // Remove reaction
      const oldReaction = myReaction
      setMyReaction(null)
      setReactionsCount(c => Math.max(0, c - 1))
      setReactions(prev => {
        const next = { ...prev }
        if (next[oldReaction]) next[oldReaction] = Math.max(0, next[oldReaction] - 1)
        return next
      })
      try {
        await fetch('/api/posts/react', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, type: oldReaction }),
        })
      } catch {}
    } else {
      // Add 'like' reaction
      setMyReaction('like')
      setReactionsCount(c => c + 1)
      setReactions(prev => ({ ...prev, like: (prev.like || 0) + 1 }))
      try {
        await fetch('/api/posts/react', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, type: 'like' }),
        })
      } catch {}
    }
  }

  const handleReaction = async (type: string) => {
    if (!user) { toast.error('سجّل دخول الأول'); return }
    setShowReactions(false)

    if (myReaction === type) {
      // Toggle off
      setMyReaction(null)
      setReactionsCount(c => Math.max(0, c - 1))
      setReactions(prev => {
        const next = { ...prev }
        if (next[type]) next[type] = Math.max(0, next[type] - 1)
        return next
      })
    } else {
      // Change or add reaction
      if (myReaction) {
        // Remove old
        setReactions(prev => {
          const next = { ...prev }
          if (next[myReaction]) next[myReaction] = Math.max(0, next[myReaction] - 1)
          return next
        })
      } else {
        setReactionsCount(c => c + 1)
      }
      setMyReaction(type)
      setReactions(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }))
    }

    try {
      await fetch('/api/posts/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, type }),
      })
    } catch {}
  }

  // Reaction emojis
  const REACTION_EMOJIS: Record<string, string> = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡',
  }

  const REACTION_LABELS: Record<string, string> = {
    like: 'إعجاب',
    love: 'حب',
    laugh: 'ضحك',
    wow: 'دهشة',
    sad: 'حزن',
    angry: 'غضب',
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
    if (!commentText.trim() && !commentImage && !commentVoice) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          content: commentText.trim() || undefined,
          imageUrl: commentImage || undefined,
          voiceData: commentVoice || undefined,
          voiceDuration: commentVoice ? 30 : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      setComments((prev) => [...prev, data])
      setCommentText('')
      setCommentImage(null)
      setCommentVoice(null)
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

  const startVoiceComment = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => { setCommentVoice(reader.result as string) }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      setCommentRecorder(recorder)
      setRecordingComment(true)
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
          setRecordingComment(false)
        }
      }, 30000)
    } catch {
      toast.error('مفيش ميكروفون متاح')
    }
  }

  const stopVoiceComment = () => {
    if (commentRecorder && commentRecorder.state === 'recording') {
      commentRecorder.stop()
    }
    setRecordingComment(false)
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

  const saveEdit = async () => {
    try {
      const res = await fetch('/api/posts/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, content: editText }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم التعديل')
        setEditingPost(false)
        window.location.reload()
      } else {
        toast.error(data.error || 'فشل')
      }
    } catch { toast.error('فشل') }
  }

  const togglePin = async () => {
    try {
      const res = await fetch('/api/posts/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsPinned(data.isPinned)
        toast.success(data.isPinned ? 'تم التثبيت' : 'تم إلغاء التثبيت')
      }
    } catch {}
  }

  const blockUser = async () => {
    if (!post.user?.id) return
    if (!confirm('متأكد من حظر هذا المستخدم؟')) return
    try {
      await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: post.user.id, action: 'block' }),
      })
      toast.success('تم الحظر')
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
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  @{post.user?.username} · {timeAgo(post.createdAt)}
                  {post.privacy && post.privacy !== 'public' && (
                    <span className="inline-flex items-center" title={post.privacy === 'friends' ? 'أصدقاء' : 'خاص'}>
                      {post.privacy === 'friends' ? (
                        <Users className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
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
                      {/* Edit — only on own posts within 15 min */}
                      {user.id === post.user?.id && (
                        <button onClick={() => { setMoreMenu(false); setEditingPost(true) }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm">
                          <Pencil className="h-4 w-4" /> تعديل
                        </button>
                      )}
                      {/* Pin — only on own posts */}
                      {user.id === post.user?.id && (
                        <button onClick={() => { setMoreMenu(false); togglePin() }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm">
                          <Pin className="h-4 w-4" /> {isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                        </button>
                      )}
                      {/* Block — only on others' posts */}
                      {user.id !== post.user?.id && (
                        <button onClick={() => { setMoreMenu(false); blockUser() }} className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm text-destructive">
                          <Ban className="h-4 w-4" /> حظر
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
          {editingPost ? (
            <div className="px-4 pb-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-muted/40 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={3}
                maxLength={2000}
                autoFocus
              />
              <div className="flex gap-2 mt-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditingPost(false)}>إلغاء</Button>
                <Button size="sm" onClick={saveEdit}>حفظ</Button>
              </div>
            </div>
          ) : (
            post.content && (
              <div className="px-4 pb-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {(post.content || '').split(/(\s+)/).map((word, i) => {
                    if (word.startsWith('#')) {
                      return <span key={i} className="text-primary font-medium cursor-pointer hover:underline">{word}</span>
                    }
                    return word
                  })}
                </p>
                {(post as any).isEdited && <span className="text-[10px] text-muted-foreground">معدّل</span>}
                {(post as any).hashtags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(post as any).hashtags.split(',').map((tag: string, i: number) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Image */}
          {post.imageUrl && (
            <div className="relative cursor-pointer" onDoubleClick={handleDoubleClick} onClick={() => setImageViewer(post.imageUrl || null)}>
              <img src={post.imageUrl} alt="Post" className="w-full max-h-[600px] object-cover" loading="lazy" />
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
            {/* Like/Reaction button with hover popup */}
            <div
              className="relative"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {/* Reaction popup */}
              {showReactions && (
                <div className="absolute bottom-full mb-2 left-0 flex gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-xl z-20">
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={`text-2xl hover:scale-125 transition-transform ${myReaction === type ? 'scale-110' : ''}`}
                      title={REACTION_LABELS[type]}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={toggleLike}
                className="flex items-center gap-1.5 text-sm transition"
              >
                <motion.div animate={myReaction ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
                  {myReaction ? (
                    <span className="text-xl leading-none">{REACTION_EMOJIS[myReaction]}</span>
                  ) : (
                    <ThumbsUp className="h-5 w-5 text-muted-foreground" />
                  )}
                </motion.div>
                <span className={`tabular-nums ${myReaction ? 'text-primary' : 'text-muted-foreground'}`}>
                  {formatCount(reactionsCount)}
                </span>
              </motion.button>
            </div>

            <button onClick={() => setShowComments(v => !v)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              <MessageCircle className="h-5 w-5" />
              <span className="tabular-nums">{formatCount(post.commentsCount)}</span>
            </button>

            <button onClick={share} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              <Share2 className="h-5 w-5" />
            </button>

            <button onClick={toggleSave} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition ml-auto">
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-primary text-primary' : ''}`} />
            </button>
          </div>

          {/* Reaction summary */}
          {reactionsCount > 0 && (
            <div className="px-4 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                {Object.entries(reactions)
                  .filter(([_, count]) => count > 0)
                  .slice(0, 3)
                  .map(([type, _]) => (
                    <span key={type} className="text-sm leading-none">
                      {REACTION_EMOJIS[type]}
                    </span>
                  ))}
              </div>
              <span>{formatCount(reactionsCount)}</span>
            </div>
          )}

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
                            <img src={commentImage} alt="Comment" className="max-h-32 rounded-lg" loading="lazy" />
                            <button onClick={() => setCommentImage(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        )}
                        {commentVoice && (
                          <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-2">
                            <VoicePlayer src={commentVoice} durationSec={30} className="flex-1" />
                            <button onClick={() => setCommentVoice(null)} className="p-1 hover:bg-destructive/20 rounded-full">
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        )}
                        {recordingComment && (
                          <div className="flex items-center gap-2 bg-red-500/10 rounded-lg p-2 text-red-500 text-xs">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            جاري التسجيل... اضغط للإيقاف
                            <button onClick={stopVoiceComment} className="mr-auto px-2 py-0.5 rounded bg-red-500 text-white text-[10px]">إيقاف</button>
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
                          <button
                            onClick={recordingComment ? stopVoiceComment : startVoiceComment}
                            className={`p-2 rounded-full transition ${recordingComment ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-muted/40 text-muted-foreground'}`}
                          >
                            <Mic className="h-4 w-4" />
                          </button>
                          <Button size="sm" onClick={submitComment} disabled={submitting || (!commentText.trim() && !commentImage && !commentVoice)} className="rounded-full h-9 w-9 p-0">
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
                          <button
                            onClick={() => {
                              const username = c.user?.username
                              if (username) onOpenProfile?.(username)
                            }}
                            className="shrink-0"
                            title={c.user?.name}
                          >
                            <Avatar name={c.user?.name || '?'} color={c.user?.avatarColor || '#888'} imageUrl={c.user?.avatarUrl} size="sm" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted/40 rounded-2xl px-3 py-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                <button
                                  onClick={() => {
                                    const username = c.user?.username
                                    if (username) onOpenProfile?.(username)
                                  }}
                                  className="font-medium text-sm hover:underline"
                                >
                                  {c.user?.name}
                                </button>
                                <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                              </div>
                              {c.content && <p className="text-sm whitespace-pre-wrap">{c.content}</p>}
                            </div>
                            {c.imageUrl && <img src={c.imageUrl} alt="Comment" className="mt-1 max-h-40 rounded-lg" loading="lazy" />}
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
