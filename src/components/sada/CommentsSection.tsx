'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from './Avatar'
import { Trash2, Send, MessageCircle, Loader2, CornerDownRight, Heart } from 'lucide-react'
import { timeAgo } from '@/lib/format'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import type { SadaComment } from '@/lib/types'

interface CommentsSectionProps {
  voiceNoteId: string
  initialCount: number
}

export function CommentsSection({
  voiceNoteId,
  initialCount,
}: CommentsSectionProps) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<SadaComment[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const user = useSada((s) => s.user)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/voice-notes/comments?voiceNoteId=${voiceNoteId}`
      )
      const data = await res.json()
      setComments(data.comments || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [voiceNoteId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const submit = async () => {
    if (!content.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/voice-notes/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الإرسال')
        return
      }
      setComments((prev) => [...prev, data.comment])
      setContent('')
      toast.success('تم إضافة تعليقك')
    } catch {
      toast.error('فشل الإرسال')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/voice-notes/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceNoteId,
          content: replyContent,
          parentId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الإرسال')
        return
      }
      // Add reply to the parent comment
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), data.comment] }
            : c
        )
      )
      setReplyContent('')
      setReplyingTo(null)
      toast.success('تم إضافة ردك')
    } catch {
      toast.error('فشل الإرسال')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    const prev = comments
    // Optimistically remove from flat list including replies
    setComments((cs) =>
      cs
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => r.id !== id),
        }))
    )
    try {
      const res = await fetch(`/api/voice-notes/comments?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
    } catch {
      setComments(prev)
      toast.error('فشل الحذف')
    }
  }

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <MessageCircle className="h-4 w-4" />
        <span>
          {initialCount > 0 ? `${initialCount} تعليق` : 'أضف تعليق'}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Comment input */}
          {user ? (
            <div className="flex gap-2 items-start">
              <Avatar
                name={user.name}
                color={user.avatarColor}
                size="sm"
              />
              <div className="flex-1 space-y-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب تعليقك..."
                  rows={2}
                  maxLength={500}
                  className="resize-none text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={submit}
                    disabled={submitting || !content.trim()}
                    className="gap-1 h-8"
                  >
                    {submitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    إرسال
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              سجّل دخولك للتعليق
            </p>
          )}

          {/* Comments list */}
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              مفيش تعليقات لسه. كن أول واحد!
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id}>
                  <CommentItem
                    comment={c}
                    user={user}
                    onReply={(id) => {
                      setReplyingTo(id === replyingTo ? null : id)
                      setReplyContent('')
                    }}
                    onDelete={remove}
                    replyingTo={replyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    submitReply={submitReply}
                    submitting={submitting}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  user,
  onReply,
  onDelete,
  replyingTo,
  replyContent,
  setReplyContent,
  submitReply,
  submitting,
}: {
  comment: SadaComment
  user: any
  onReply: (id: string) => void
  onDelete: (id: string) => void
  replyingTo: string | null
  replyContent: string
  setReplyContent: (v: string) => void
  submitReply: (parentId: string) => void
  submitting: boolean
}) {
  return (
    <div className="flex gap-2 items-start">
      <Avatar
        name={comment.user.name}
        color={comment.user.avatarColor}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-muted/40 rounded-2xl px-3 py-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm">{comment.user.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {user && (
            <>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/comments/like', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ commentId: comment.id }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      // Update local state
                      setComments((prev) =>
                        prev.map((c) =>
                          c.id === comment.id
                            ? {
                                ...c,
                                likedByMe: data.liked,
                                likesCount: data.likesCount,
                              } as any
                            : c
                        )
                      )
                    }
                  } catch {}
                }}
                className={`text-[11px] flex items-center gap-1 transition ${
                  (comment as any).likedByMe
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <Heart
                  className={`h-3 w-3 ${(comment as any).likedByMe ? 'fill-primary' : ''}`}
                />
                {(comment as any).likesCount > 0 && (
                  <span className="tabular-nums">{(comment as any).likesCount}</span>
                )}
              </button>
              <button
                onClick={() => onReply(comment.id)}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <CornerDownRight className="h-3 w-3" />
                رد
              </button>
            </>
          )}
          {user?.id === comment.user.id && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              حذف
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 mr-4 border-r border-border/40 pr-2">
            {comment.replies.map((r) => (
              <div key={r.id} className="flex gap-2 items-start">
                <Avatar
                  name={r.user.name}
                  color={r.user.avatarColor}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-muted/30 rounded-2xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{r.user.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {r.content}
                    </p>
                  </div>
                  {user && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/comments/like', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ commentId: r.id }),
                          })
                          const data = await res.json()
                          if (res.ok) {
                            // Update reply in local state
                            setComments((prev) =>
                              prev.map((c) => ({
                                ...c,
                                replies: (c.replies || []).map((reply) =>
                                  reply.id === r.id
                                    ? {
                                        ...reply,
                                        likedByMe: data.liked,
                                        likesCount: data.likesCount,
                                      } as any
                                    : reply
                                ),
                              }))
                            )
                          }
                        } catch {}
                      }}
                      className={`text-[11px] flex items-center gap-1 transition mt-1 ${
                        (r as any).likedByMe
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <Heart
                        className={`h-3 w-3 ${(r as any).likedByMe ? 'fill-primary' : ''}`}
                      />
                      {(r as any).likesCount > 0 && (
                        <span className="tabular-nums">{(r as any).likesCount}</span>
                      )}
                    </button>
                  )}
                  {user?.id === r.user.id && (
                    <button
                      onClick={() => onDelete(r.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="mt-2 flex gap-2 items-start">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`رد على ${comment.user.name}...`}
              rows={2}
              maxLength={500}
              className="resize-none text-sm flex-1"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => submitReply(comment.id)}
                disabled={submitting || !replyContent.trim()}
                className="gap-1 h-8"
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onReply('')
                  setReplyContent('')
                }}
                className="h-8 text-xs"
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
