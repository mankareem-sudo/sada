'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from './Avatar'
import { Trash2, Send, MessageCircle, Loader2 } from 'lucide-react'
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

  const remove = async (id: string) => {
    const prev = comments
    setComments((c) => c.filter((x) => x.id !== id))
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
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <Avatar
                    name={c.user.name}
                    color={c.user.avatarColor}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/40 rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">
                          {c.user.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    </div>
                    {user?.id === c.user.id && (
                      <button
                        onClick={() => remove(c.id)}
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
        </div>
      )}
    </div>
  )
}
