'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Heart,
  Flag,
  MoreHorizontal,
  Play,
  Bookmark,
  Share2,
  FileText,
  Loader2,
  Mic2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { CommentsSection } from './CommentsSection'
import { formatDuration, timeAgo, formatCount } from '@/lib/format'
import type { SadaVoiceNote } from '@/lib/types'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSada } from '@/lib/store'

const REPORT_REASONS: { value: string; label: string; description: string }[] = [
  { value: 'religion', label: 'إساءة للأديان', description: 'سخرية أو إساءة لمعتقد ديني' },
  { value: 'politics', label: 'محتوى سياسي مسيء', description: 'تحريض أو سخرية سياسية' },
  { value: 'insult', label: 'إهانة أو شتائم', description: 'إساءة شخصية أو لفظ نابٍ' },
  { value: 'spam', label: 'سبام أو تكرار', description: 'محتوى متكرر أو إعلاني' },
  { value: 'other', label: 'سبب آخر', description: 'شيء غير ما سبق' },
]

interface VoiceNoteCardProps {
  note: SadaVoiceNote
  showAuthor?: boolean
  onOpenProfile?: (username: string) => void
  /** Hide duet button (e.g., for replies themselves to avoid infinite nesting) */
  hideDuet?: boolean
}

export function VoiceNoteCard({
  note,
  showAuthor = true,
  onOpenProfile,
  hideDuet = false,
}: VoiceNoteCardProps) {
  const [liked, setLiked] = useState(note.likedByMe ?? false)
  const [likesCount, setLikesCount] = useState(note.likesCount ?? 0)
  const [saved, setSaved] = useState(note.bookmarkedByMe ?? false)
  const [transcript, setTranscript] = useState<string | null>(note.transcript || null)
  const [transcribing, setTranscribing] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [moreMenu, setMoreMenu] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState<SadaVoiceNote[]>([])
  const [showVoiceReplies, setShowVoiceReplies] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [repliesCount, setRepliesCount] = useState<number | null>(null)
  const user = useSada((s) => s.user)
  const openRecorder = useSada((s) => s.openRecorder)

  const toggleLike = async () => {
    if (!user) {
      toast.error('سجّل دخول الأول عشان تعمل لايك')
      return
    }
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount((c) => Math.max(0, c + (newLiked ? 1 : -1)))
    try {
      await fetch('/api/voice-notes/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          action: newLiked ? 'like' : 'unlike',
        }),
      })
    } catch {
      setLiked(!newLiked)
      setLikesCount((c) => Math.max(0, c + (newLiked ? -1 : 1)))
      toast.error('مفيش إنترنت، حاول مرة تانية')
    }
  }

  const toggleSave = async () => {
    if (!user) {
      toast.error('سجّل دخول الأول')
      return
    }
    const newSaved = !saved
    setSaved(newSaved)
    try {
      await fetch('/api/voice-notes/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          action: newSaved ? 'save' : 'unsave',
        }),
      })
      toast.success(newSaved ? 'اتحفظ في قائمتك' : 'اتشال من المحفوظات')
    } catch {
      setSaved(!newSaved)
      toast.error('فشل، حاول مرة تانية')
    }
  }

  const transcribe = async () => {
    if (transcript) return
    setTranscribing(true)
    try {
      const res = await fetch('/api/voice-notes/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الترجمة')
        return
      }
      setTranscript(data.transcript)
      toast.success('اترجم الصوت لنص')
    } catch {
      toast.error('فشل الترجمة')
    } finally {
      setTranscribing(false)
    }
  }

  const share = async () => {
    try {
      const res = await fetch('/api/voice-notes/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id }),
      })
      const data = await res.json()
      const shareUrl = `${window.location.origin}${data.url}`
      if (navigator.share) {
        await navigator.share({
          title: 'صدى',
          text: data.text,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('اتنسخ الرابط. شاركه مع أصحابك!')
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('فشل المشاركة')
      }
    }
  }

  const handlePlay = async () => {
    try {
      await fetch('/api/voice-notes/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id }),
      })
    } catch {
      // ignore
    }
  }

  // === Voice Replies (Duet) ===
  const loadVoiceReplies = async () => {
    if (loadingReplies) return
    setLoadingReplies(true)
    try {
      const res = await fetch(`/api/voice-notes/replies?voiceNoteId=${note.id}`)
      const data = await res.json()
      setVoiceReplies(data.replies || [])
      setRepliesCount((data.replies || []).length)
    } catch {
      toast.error('فشل تحميل الردود الصوتية')
    } finally {
      setLoadingReplies(false)
    }
  }

  const toggleVoiceReplies = () => {
    if (!showVoiceReplies && voiceReplies.length === 0) {
      loadVoiceReplies()
    }
    setShowVoiceReplies(!showVoiceReplies)
  }

  const handleDuet = () => {
    if (!user) {
      toast.error('سجّل دخول الأول عشان ترد بصوت')
      return
    }
    // Store the parent voice note ID so the recorder knows where to attach the reply
    try {
      sessionStorage.setItem('sada-duet-parent', note.id)
    } catch {}
    openRecorder('duet' as any)
  }

  // Listen for new duet (when recorder closes after submitting a duet)
  // — refresh replies if visible
  useEffect(() => {
    if (!showVoiceReplies) return
    const interval = setInterval(() => {
      const duetParent = sessionStorage.getItem('sada-duet-parent')
      // If duet parent was cleared (i.e., duet was submitted), refresh
      if (!duetParent && voiceReplies.length >= 0) {
        // Refresh once per second at most
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [showVoiceReplies, voiceReplies.length])

  // Refresh replies when user returns to the card after recording a duet
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && showVoiceReplies) {
        const duetParent = sessionStorage.getItem('sada-duet-parent')
        if (!duetParent) {
          // Duet was submitted, refresh
          loadVoiceReplies()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [showVoiceReplies])

  return (
    <Card className="p-4 sada-glass sada-fade-up border-border/50 rounded-2xl">
      {showAuthor && note.user && (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => onOpenProfile?.(note.user!.username)}
            className="flex items-center gap-3 group"
          >
            <Avatar
              name={note.user.name}
              color={note.user.avatarColor}
              imageUrl={note.user.avatarUrl}
              size="md"
            />
            <div className="text-right">
              <div className="font-semibold text-sm group-hover:underline">
                {note.user.name}
              </div>
              <div className="text-xs text-muted-foreground">
                @{note.user.username} · {timeAgo(note.createdAt)}
              </div>
            </div>
          </button>

          <div className="relative">
            <button
              onClick={() => setMoreMenu((v) => !v)}
              className="p-2 hover:bg-muted/60 rounded-full transition"
              aria-label="خيارات"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMoreMenu(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => {
                      setMoreMenu(false)
                      share()
                    }}
                    className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    مشاركة
                  </button>
                  <button
                    onClick={() => {
                      setMoreMenu(false)
                      transcribe()
                    }}
                    className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm"
                    disabled={!!transcript || transcribing}
                  >
                    <FileText className="h-4 w-4" />
                    {transcript ? 'النص متاح' : 'ترجمة لنص'}
                  </button>
                  <button
                    onClick={() => {
                      setMoreMenu(false)
                      setReportOpen(true)
                    }}
                    className="w-full text-right px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm text-destructive"
                  >
                    <Flag className="h-4 w-4" />
                    إبلاغ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {note.prompt && (
        <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/15">
          <div className="text-[11px] text-primary/80 mb-1">السؤال</div>
          <div className="text-sm font-medium">{note.prompt.text}</div>
        </div>
      )}

      {note.description && (
        <p className="text-sm mb-3 whitespace-pre-wrap leading-relaxed">
          {note.description}
        </p>
      )}

      <VoicePlayer
        src={note.audioData}
        durationSec={note.durationSec}
        onPlayedOnce={handlePlay}
        title={note.transcript ? note.transcript.slice(0, 60) + (note.transcript.length > 60 ? '...' : '') : 'تسجيل صوتي'}
        artist={note.user?.name}
        album="صدى"
        artworkUrl={note.user?.avatarUrl || undefined}
      />

      {/* Transcript (if available or being generated) */}
      {transcribing && (
        <div className="mt-3 p-3 rounded-xl bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          جاري ترجمة الصوت لنص...
        </div>
      )}
      {transcript && !transcribing && (
        <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/40">
          <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            ترجمة الصوت
          </div>
          <p className="text-sm leading-relaxed">{transcript}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition"
            aria-label="إعجاب"
          >
            <Heart
              className={`h-4 w-4 ${liked ? 'fill-primary text-primary' : ''}`}
            />
            <span className="tabular-nums">{formatCount(likesCount)}</span>
          </button>

          {/* Duet (voice reply) button — only on original voice notes, not on replies */}
          {!hideDuet && (
            <button
              onClick={handleDuet}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition"
              aria-label="رد صوتي (Duet)"
              title="رد بصوت على هذا الصدى"
            >
              <Mic2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={toggleSave}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition"
            aria-label="حفظ"
          >
            <Bookmark
              className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`}
            />
          </button>

          <button
            onClick={share}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition"
            aria-label="مشاركة"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Play className="h-3 w-3" />
          <span className="tabular-nums">{formatCount(note.plays)}</span>
        </div>
      </div>

      <CommentsSection
        voiceNoteId={note.id}
        initialCount={note.commentsCount ?? 0}
      />

      {/* Voice Replies (Duet) — toggle + list */}
      {!hideDuet && (
        <div className="mt-3">
          <button
            onClick={toggleVoiceReplies}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition"
          >
            {showVoiceReplies ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <Mic2 className="h-3.5 w-3.5" />
            <span>
              {loadingReplies
                ? 'جاري التحميل...'
                : showVoiceReplies
                  ? 'إخفاء الردود الصوتية'
                  : repliesCount !== null
                    ? `عرض الردود الصوتية (${repliesCount})`
                    : 'عرض الردود الصوتية'}
            </span>
          </button>

          {showVoiceReplies && (
            <div className="mt-3 space-y-2 pl-3 border-l-2 border-accent/20">
              {loadingReplies ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : voiceReplies.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  مفيش ردود صوتية لسه — كن أول واحد يرد بصوت 🎙️
                </p>
              ) : (
                voiceReplies.map((reply) => (
                  <div key={reply.id} className="rounded-xl bg-muted/20 p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      {reply.user && (
                        <Avatar
                          name={reply.user.name}
                          color={reply.user.avatarColor}
                          imageUrl={reply.user.avatarUrl}
                          size="sm"
                          isVerified={reply.user.isVerified}
                        />
                      )}
                      <div className="text-right flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {reply.user?.name || 'مستخدم'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {timeAgo(reply.createdAt)}
                        </div>
                      </div>
                      <button
                        onClick={handleDuet}
                        className="text-[10px] text-muted-foreground hover:text-accent transition"
                        title="رد على هذا الصدى"
                      >
                        <Mic2 className="h-3 w-3" />
                      </button>
                    </div>
                    {reply.description && (
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {reply.description}
                      </p>
                    )}
                    <VoicePlayer
                      src={reply.audioData}
                      durationSec={reply.durationSec}
                      accent="accent"
                      title={reply.description || 'رد صوتي'}
                      artist={reply.user?.name}
                      album="رد صوتي على صدى"
                      artworkUrl={reply.user?.avatarUrl || undefined}
                    />
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className={`h-3 w-3 ${reply.likedByMe ? 'fill-primary text-primary' : ''}`} />
                        {formatCount(reply.likesCount || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {formatCount(reply.plays)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        voiceNoteId={note.id}
      />
    </Card>
  )
}

function ReportDialog({
  open,
  onOpenChange,
  voiceNoteId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  voiceNoteId: string
}) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!reason) {
      toast.error('اختار سبب البلاغ')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/voice-notes/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId, reason, comment }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الإرسال')
        return
      }
      toast.success('وصل البلاغ، شكراً لمساعدتنا نحافظ على صدى نظيفة')
      onOpenChange(false)
      setReason('')
      setComment('')
    } catch {
      toast.error('فشل الإرسال')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>الإبلاغ عن المحتوى</DialogTitle>
          <DialogDescription>
            صدى مكان للحوار الهادئ. لو شفت إساءة لدين أو سياسة أو إهانة، بلّغنا وهنراجعه فوراً.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="gap-2 my-2">
          {REPORT_REASONS.map((r) => (
            <div
              key={r.value}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition cursor-pointer"
              onClick={() => setReason(r.value)}
            >
              <RadioGroupItem value={r.value} id={`r-${r.value}`} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={`r-${r.value}`} className="font-medium cursor-pointer">
                  {r.label}
                </Label>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {r.description}
                </div>
              </div>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="تفاصيل إضافية (اختياري)"
          className="resize-none"
          rows={3}
          maxLength={500}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={submitting || !reason}
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
