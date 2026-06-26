'use client'

import { useState, useCallback, useEffect } from 'react'
import { Avatar } from './Avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, CornerDownRight, Trash2, Send, X, Loader2, ThumbsUp } from 'lucide-react'
import { timeAgo, formatCount } from '@/lib/format'
import type { SadaComment } from '@/lib/types'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CommentsSectionProps {
  voiceNoteId: string
  initialCount: number
}

interface NestedComment extends SadaComment {
  depth?: number
  replyToName?: string | null
  likedByMe?: boolean
  likesCount?: number
  replies?: NestedComment[]
}

export function CommentsSection({ voiceNoteId, initialCount }: CommentsSectionProps) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<NestedComment[]>([])
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const user = useSada((s) => s.user)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setTab = useSada((s) => s.setTab)

  const openProfile = (username: string) => {
    if (!username) return
    setViewedUsername(username)
    setTab('profile')
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/comments?postId=${voiceNoteId}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {} finally { setLoading(false) }
  }, [voiceNoteId])

  useEffect(() => {
    if (open && comments.length === 0) load()
  }, [open, comments.length, load])

  const submit = async (parentId?: string) => {
    const text = parentId ? content.trim() : content.trim()
    if (!text) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: voiceNoteId, content: text, parentId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      
      if (parentId) {
        // Add as reply
        setComments(prev => addReplyToTree(prev, parentId, data))
      } else {
        // Add as top-level comment
        setComments(prev => [...prev, { ...data, replies: [], depth: 0 }])
      }
      setContent('')
      toast.success('تم النشر')
    } catch { toast.error('فشل') } finally { setSubmitting(false) }
  }

  const remove = async (id: string) => {
    setComments(prev => removeCommentFromTree(prev, id))
    try {
      await fetch(`/api/posts/comments?id=${id}`, { method: 'DELETE' })
    } catch {}
  }

  const toggleCommentLike = async (commentId: string) => {
    // Optimistic update
    setComments(prev => toggleLikeInTree(prev, commentId))
    try {
      await fetch('/api/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      })
    } catch {}
  }

  const totalCount = countAllComments(comments)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-muted-foreground hover:text-primary transition flex items-center gap-1.5"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {totalCount > 0 ? `${formatCount(totalCount)} تعليق` : 'تعليق'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Comment input */}
          {user && (
            <div className="flex gap-2 items-start">
              <Avatar name={user.name} color={user.avatarColor} imageUrl={user.avatarUrl} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب تعليق..."
                  className="flex-1 bg-muted/40 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit())}
                />
                <Button
                  size="sm"
                  onClick={() => submit()}
                  disabled={submitting || !content.trim()}
                  className="rounded-full h-9 w-9 p-0"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Comments list */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">مفيش تعليقات لسه</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  user={user}
                  onOpenProfile={openProfile}
                  onReply={(parentId) => {
                    setContent('')
                    // Focus the reply input for this comment
                  }}
                  onDelete={remove}
                  onLike={toggleCommentLike}
                  onSubmitReply={(parentId, text) => {
                    // Submit reply
                    fetch('/api/posts/comments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ postId: voiceNoteId, content: text, parentId }),
                    }).then(r => r.json()).then(data => {
                      if (data.id) {
                        setComments(prev => addReplyToTree(prev, parentId, data))
                        toast.success('تم الرد')
                      }
                    })
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// === Helper functions for nested comment tree ===

function countAllComments(comments: NestedComment[]): number {
  let count = 0
  for (const c of comments) {
    count++
    if (c.replies) count += countAllComments(c.replies)
  }
  return count
}

function addReplyToTree(comments: NestedComment[], parentId: string, newReply: any): NestedComment[] {
  return comments.map(c => {
    if (c.id === parentId) {
      return { ...c, replies: [...(c.replies || []), { ...newReply, replies: [], depth: (c.depth || 0) + 1 }] }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: addReplyToTree(c.replies, parentId, newReply) }
    }
    return c
  })
}

function removeCommentFromTree(comments: NestedComment[], id: string): NestedComment[] {
  return comments
    .filter(c => c.id !== id)
    .map(c => {
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: removeCommentFromTree(c.replies, id) }
      }
      return c
    })
}

function toggleLikeInTree(comments: NestedComment[], commentId: string): NestedComment[] {
  return comments.map(c => {
    if (c.id === commentId) {
      const newLiked = !c.likedByMe
      return { ...c, likedByMe: newLiked, likesCount: (c.likesCount || 0) + (newLiked ? 1 : -1) }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: toggleLikeInTree(c.replies, commentId) }
    }
    return c
  })
}

// === Comment Item Component (recursive) ===

function CommentItem({
  comment,
  user,
  onOpenProfile,
  onReply,
  onDelete,
  onLike,
  onSubmitReply,
}: {
  comment: NestedComment
  user: any
  onOpenProfile: (username: string) => void
  onReply: (parentId: string) => void
  onDelete: (id: string) => void
  onLike: (commentId: string) => void
  onSubmitReply: (parentId: string, text: string) => void
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const depth = comment.depth || 0
  const maxDepth = 5

  return (
    <div className={cn('flex gap-2 items-start', depth > 0 && 'mr-6')}>
      <button
        onClick={() => comment.user?.username && onOpenProfile(comment.user.username)}
        className="shrink-0"
        title={comment.user?.name}
      >
        <Avatar
          name={comment.user?.name || '?'}
          color={comment.user?.avatarColor || '#888'}
          imageUrl={comment.user?.avatarUrl}
          size="sm"
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/40 rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="flex items-center gap-2 mb-0.5">
            <button
              onClick={() => comment.user?.username && onOpenProfile(comment.user.username)}
              className="font-medium text-sm hover:underline"
            >
              {comment.user?.name}
            </button>
            {comment.replyToName && (
              <span className="text-[10px] text-muted-foreground">
                ← رد على {comment.replyToName}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          {comment.content && <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-1 ml-2">
          <button
            onClick={() => onLike(comment.id)}
            className={cn(
              'text-[11px] flex items-center gap-1 transition',
              comment.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <ThumbsUp className={cn('h-3 w-3', comment.likedByMe && 'fill-primary')} />
            {(comment.likesCount || 0) > 0 && (
              <span className="tabular-nums">{formatCount(comment.likesCount || 0)}</span>
            )}
          </button>

          {depth < maxDepth && (
            <button
              onClick={() => setShowReplyInput(v => !v)}
              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <CornerDownRight className="h-3 w-3" />
              رد
            </button>
          )}

          {user?.id === comment.user?.id && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div className="mt-2 flex gap-2 items-center">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`رد على ${comment.user?.name}...`}
              className="flex-1 bg-muted/30 rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && replyText.trim()) {
                  onSubmitReply(comment.id, replyText.trim())
                  setReplyText('')
                  setShowReplyInput(false)
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => {
                if (replyText.trim()) {
                  onSubmitReply(comment.id, replyText.trim())
                  setReplyText('')
                  setShowReplyInput(false)
                }
              }}
            >
              <Send className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full"
              onClick={() => setShowReplyInput(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                user={user}
                onOpenProfile={onOpenProfile}
                onReply={onReply}
                onDelete={onDelete}
                onLike={onLike}
                onSubmitReply={onSubmitReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
