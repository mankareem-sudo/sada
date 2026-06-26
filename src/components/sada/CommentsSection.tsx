'use client'

import { useState, useCallback, useEffect } from 'react'
import { Avatar } from './Avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, CornerDownRight, Trash2, Send, X, Loader2, ThumbsUp, Pin, EyeOff, Pencil } from 'lucide-react'
import { timeAgo, formatCount } from '@/lib/format'
import type { SadaComment } from '@/lib/types'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CommentsSectionProps {
  voiceNoteId: string
  initialCount: number
  postOwnerId?: string
}

interface NestedComment extends SadaComment {
  depth?: number
  replyToName?: string | null
  likedByMe?: boolean
  likesCount?: number
  replies?: NestedComment[]
}

export function CommentsSection({ voiceNoteId, initialCount, postOwnerId }: CommentsSectionProps) {
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

  const togglePin = async (commentId: string) => {
    if (!user || user.id !== postOwnerId) return
    const target = findComment(comments, commentId)
    if (!target) return
    const newPinned = !target.isPinned
    setComments(prev => setPinnedInTree(prev, commentId, newPinned))
    try {
      const res = await fetch('/api/comments/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, postId: voiceNoteId, pinned: newPinned }),
      })
      const data = await res.json()
      if (data.pinned !== undefined) {
        // If pinned, remove pin from any other comment (server enforces single-pin)
        if (data.pinned) {
          setComments(prev => unpinOthersInTree(prev, commentId))
        }
        toast.success(newPinned ? 'تم تثبيت التعليق' : 'تم إلغاء التثبيت')
      }
    } catch {
      toast.error('فشل التثبيت')
      setComments(prev => setPinnedInTree(prev, commentId, !newPinned))
    }
  }

  const toggleHide = async (commentId: string) => {
    if (!user) return
    const target = findComment(comments, commentId)
    if (!target) return
    const newHidden = !target.isHidden
    setComments(prev => setHiddenInTree(prev, commentId, newHidden))
    try {
      await fetch('/api/comments/hide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, postId: voiceNoteId, hidden: newHidden }),
      })
      toast.success(newHidden ? 'تم إخفاء التعليق' : 'تم إظهار التعليق')
    } catch {
      toast.error('فشل الإخفاء')
      setComments(prev => setHiddenInTree(prev, commentId, !newHidden))
    }
  }

  const handleEdit = (commentId: string, newContent: string, editedAt: string) => {
    setComments(prev => editCommentInTree(prev, commentId, newContent, editedAt))
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
                  onPin={togglePin}
                  onHide={toggleHide}
                  onEdit={handleEdit}
                  canPin={!!user && user.id === postOwnerId}
                  canHide={!!user && (user.id === postOwnerId || user.id === c.user?.id || user.isAdmin)}
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

function findComment(comments: NestedComment[], id: string): NestedComment | null {
  for (const c of comments) {
    if (c.id === id) return c
    if (c.replies) {
      const found = findComment(c.replies, id)
      if (found) return found
    }
  }
  return null
}

function setPinnedInTree(comments: NestedComment[], id: string, pinned: boolean): NestedComment[] {
  return comments.map(c => {
    if (c.id === id) {
      return { ...c, isPinned: pinned }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: setPinnedInTree(c.replies, id, pinned) }
    }
    return c
  })
}

function unpinOthersInTree(comments: NestedComment[], exceptId: string): NestedComment[] {
  return comments.map(c => {
    const next = c.id !== exceptId && c.isPinned ? { ...c, isPinned: false } : c
    if (next.replies && next.replies.length > 0) {
      return { ...next, replies: unpinOthersInTree(next.replies, exceptId) }
    }
    return next
  })
}

function setHiddenInTree(comments: NestedComment[], id: string, hidden: boolean): NestedComment[] {
  return comments.map(c => {
    if (c.id === id) {
      return { ...c, isHidden: hidden }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: setHiddenInTree(c.replies, id, hidden) }
    }
    return c
  })
}

function editCommentInTree(comments: NestedComment[], id: string, content: string, editedAt: string): NestedComment[] {
  return comments.map(c => {
    if (c.id === id) {
      return { ...c, content, editedAt }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: editCommentInTree(c.replies, id, content, editedAt) }
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
  onPin,
  onHide,
  onEdit,
  canPin,
  canHide,
}: {
  comment: NestedComment
  user: any
  onOpenProfile: (username: string) => void
  onReply: (parentId: string) => void
  onDelete: (id: string) => void
  onLike: (commentId: string) => void
  onSubmitReply: (parentId: string, text: string) => void
  onPin?: (commentId: string) => void
  onHide?: (commentId: string) => void
  onEdit?: (id: string, content: string, editedAt: string) => void
  canPin?: boolean
  canHide?: boolean
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content || '')
  const [savingEdit, setSavingEdit] = useState(false)
  const depth = comment.depth || 0
  const maxDepth = 5

  // Check if user can edit (own comment + within 15min window)
  const canEdit = !!user && user.id === comment.user?.id && (
    Date.now() - new Date(comment.createdAt).getTime() < 15 * 60 * 1000
  )

  const saveEdit = async () => {
    if (!editText.trim()) return
    setSavingEdit(true)
    try {
      const res = await fetch('/api/posts/comments/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: comment.id, content: editText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التعديل')
        return
      }
      // Update local comment object in place (parent re-renders via state lift)
      // Since we can't directly mutate, we trigger parent reload via onEdit callback
      onEdit?.(comment.id, data.content, data.editedAt)
      setEditing(false)
      toast.success('تم التعديل')
    } catch {
      toast.error('فشل')
    } finally {
      setSavingEdit(false)
    }
  }

  // Hidden comment placeholder (only visible to author/post-owner/admin)
  if (comment.isHidden) {
    return (
      <div className={cn('flex gap-2 items-start', depth > 0 && 'mr-6')}>
        <div className="shrink-0">
          <Avatar
            name={comment.user?.name || '?'}
            color={comment.user?.avatarColor || '#888'}
            imageUrl={comment.user?.avatarUrl}
            size="sm"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/20 rounded-2xl px-3 py-2 inline-block border border-dashed border-border/50">
            <p className="text-xs text-muted-foreground italic">
              تم إخفاء هذا التعليق
            </p>
          </div>
          {canHide && onHide && (
            <button
              onClick={() => onHide(comment.id)}
              className="text-[11px] text-muted-foreground hover:text-primary mt-1 ml-2"
            >
              إظهار
            </button>
          )}
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
                  onPin={onPin}
                  onHide={onHide}
                  onEdit={onEdit}
                  canPin={canPin}
                  canHide={canHide}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

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
        <div className={cn(
          'rounded-2xl px-3 py-2 inline-block max-w-full',
          comment.isPinned ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'
        )}>
          {comment.isPinned && (
            <div className="flex items-center gap-1 mb-1 text-[10px] text-primary font-medium">
              <Pin className="h-3 w-3" />
              مثبّت
            </div>
          )}
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
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
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(comment.createdAt)}
              {comment.editedAt && (
                <span className="ml-1" title="تم التعديل">
                  <Pencil className="inline h-2.5 w-2.5" /> معدّل
                </span>
              )}
            </span>
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-muted/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={2}
                maxLength={500}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={savingEdit || !editText.trim()}
                  className="text-[11px] px-3 py-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                >
                  {savingEdit && <Loader2 className="h-3 w-3 animate-spin" />}
                  حفظ
                </button>
                <button
                  onClick={() => { setEditing(false); setEditText(comment.content || '') }}
                  className="text-[11px] px-3 py-1 text-muted-foreground hover:text-foreground"
                >
                  إلغاء
                </button>
                <span className="text-[10px] text-muted-foreground mr-auto">
                  {editText.length}/500
                </span>
              </div>
            </div>
          ) : (
            comment.content && <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-1 ml-2 flex-wrap">
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

          {canPin && onPin && depth === 0 && (
            <button
              onClick={() => onPin(comment.id)}
              className={cn(
                'text-[11px] flex items-center gap-1 transition',
                comment.isPinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
              title={comment.isPinned ? 'إلغاء التثبيت' : 'تثبيت التعليق'}
            >
              <Pin className="h-3 w-3" />
            </button>
          )}

          {canHide && onHide && (
            <button
              onClick={() => onHide(comment.id)}
              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
              title={comment.isHidden ? 'إظهار التعليق' : 'إخفاء التعليق'}
            >
              <EyeOff className="h-3 w-3" />
            </button>
          )}

          {canEdit && !editing && (
            <button
              onClick={() => { setEditing(true); setEditText(comment.content || '') }}
              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
              title="تعديل التعليق"
            >
              <Pencil className="h-3 w-3" />
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
                onPin={onPin}
                onHide={onHide}
                canPin={canPin}
                canHide={canHide}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
