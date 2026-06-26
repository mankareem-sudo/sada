'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Image as ImageIcon, X, Loader2, Send, Type, Globe, Users, Lock, Clock,
  BarChart3, Link2, Plus, Trash2, Check,
} from 'lucide-react'
import { useSada } from '@/lib/store'
import { compressPostImage } from '@/lib/image-compress'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ComposerMode = 'text' | 'poll' | 'link'

interface LinkPreview {
  url: string
  title?: string | null
  description?: string | null
  image?: string | null
  siteName?: string | null
}

interface PollOptionInput {
  id: string
  text: string
}

export function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ComposerMode>('text')
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public')
  const [scheduleAt, setScheduleAt] = useState<string>('')

  // === Poll state ===
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<PollOptionInput[]>([
    { id: 'opt_1', text: '' },
    { id: 'opt_2', text: '' },
  ])
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false)
  const [pollDurationHours, setPollDurationHours] = useState(24)

  // === Link state ===
  const [linkUrl, setLinkUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
  const [linkFetching, setLinkFetching] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const user = useSada((s) => s.user)

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجا'); return }
    try {
      const compressed = await compressPostImage(file)
      setImage(compressed)
      // Image implies text mode (image post)
      if (mode === 'poll' || mode === 'link') setMode('text')
    } catch { toast.error('فشل') }
  }

  // === Draft saving ===
  useEffect(() => {
    if (open) {
      const draft = localStorage.getItem('sada-post-draft')
      if (draft) {
        try {
          const d = JSON.parse(draft)
          setText(d.text || '')
          setImage(d.image || null)
          if (d.mode) setMode(d.mode)
          if (d.pollQuestion) setPollQuestion(d.pollQuestion)
          if (d.pollOptions) setPollOptions(d.pollOptions)
          if (d.linkUrl) setLinkUrl(d.linkUrl)
        } catch {}
      }
    }
  }, [open])

  useEffect(() => {
    if (open) {
      localStorage.setItem('sada-post-draft', JSON.stringify({
        text, image, mode, pollQuestion, pollOptions, linkUrl,
      }))
    }
  }, [text, image, mode, pollQuestion, pollOptions, linkUrl, open])

  // === Link preview auto-fetch (debounced) ===
  useEffect(() => {
    if (mode !== 'link') return
    const trimmed = linkUrl.trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setLinkPreview(null)
      return
    }
    const t = setTimeout(async () => {
      setLinkFetching(true)
      try {
        const res = await fetch('/api/posts/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        })
        if (res.ok) {
          const data = await res.json()
          setLinkPreview(data)
        }
      } catch {}
      finally { setLinkFetching(false) }
    }, 800)
    return () => clearTimeout(t)
  }, [linkUrl, mode])

  // === Poll helpers ===
  const addPollOption = () => {
    if (pollOptions.length >= 6) {
      toast.error('أقصى عدد خيارات 6')
      return
    }
    setPollOptions(prev => [...prev, { id: `opt_${prev.length + 1}_${Date.now()}`, text: '' }])
  }
  const removePollOption = (id: string) => {
    if (pollOptions.length <= 2) {
      toast.error('أقل عدد خيارات 2')
      return
    }
    setPollOptions(prev => prev.filter(o => o.id !== id))
  }
  const updatePollOption = (id: string, value: string) => {
    setPollOptions(prev => prev.map(o => o.id === id ? { ...o, text: value } : o))
  }

  const canSubmit = () => {
    if (loading) return false
    if (mode === 'text') return !!(text.trim() || image)
    if (mode === 'poll') {
      const filledOptions = pollOptions.filter(o => o.text.trim())
      return !!(pollQuestion.trim() && filledOptions.length >= 2)
    }
    if (mode === 'link') return !!linkUrl.trim()
    return false
  }

  const submit = async () => {
    if (!canSubmit()) return
    setLoading(true)
    try {
      let body: any = { privacy, scheduledAt: scheduleAt || undefined }

      if (mode === 'text') {
        body.type = image ? 'image' : 'text'
        body.content = text.trim() || undefined
        body.imageUrl = image || undefined
      } else if (mode === 'poll') {
        body.type = 'poll'
        body.content = text.trim() || undefined  // optional context
        body.pollQuestion = pollQuestion.trim()
        body.pollOptions = pollOptions.filter(o => o.text.trim()).map(o => o.text.trim())
        body.pollAllowMultiple = pollAllowMultiple
        body.pollDurationHours = pollDurationHours
      } else if (mode === 'link') {
        body.type = 'link'
        body.content = text.trim() || undefined
        body.linkPreview = linkPreview || { url: linkUrl.trim() }
      }

      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'فشل النشر')
        return
      }
      toast.success('تم النشر 🎉')
      // Reset
      setText('')
      setImage(null)
      setMode('text')
      setPollQuestion('')
      setPollOptions([{ id: 'opt_1', text: '' }, { id: 'opt_2', text: '' }])
      setPollAllowMultiple(false)
      setPollDurationHours(24)
      setLinkUrl('')
      setLinkPreview(null)
      setScheduleAt('')
      localStorage.removeItem('sada-post-draft')
      setOpen(false)
      onPosted?.()
    } catch { toast.error('فشل') } finally { setLoading(false) }
  }

  const modeButtons: Array<{ id: ComposerMode; label: string; icon: typeof Type }> = [
    { id: 'text', label: 'نص/صورة', icon: Type },
    { id: 'poll', label: 'استطلاع', icon: BarChart3 },
    { id: 'link', label: 'رابط', icon: Link2 },
  ]

  if (!open) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="p-3 sada-glass rounded-2xl">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-3 text-right text-muted-foreground text-sm hover:text-foreground transition"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Type className="h-4 w-4" />
            </div>
            <span>شارك فكرة، صورة، سؤال، أو استطلاع...</span>
          </button>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="p-4 sada-glass rounded-2xl border-primary/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">منشور جديد</h3>
          <button
            onClick={() => {
              setOpen(false)
              setText('')
              setImage(null)
              setMode('text')
            }}
            className="p-1 hover:bg-muted/40 rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 mb-3 bg-muted/30 rounded-full p-1">
          {modeButtons.map(m => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition',
                  mode === m.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* === Text/Image content (always shown except pure poll) === */}
        {mode !== 'poll' && (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === 'link' ? 'علّق على الرابط (اختياري)...' : 'إيه اللي في بالك؟'}
            rows={3}
            maxLength={2000}
            className="resize-none bg-transparent border-0 focus-visible:ring-0 text-sm"
            autoFocus
          />
        )}

        {/* === Poll UI === */}
        {mode === 'poll' && (
          <div className="space-y-3">
            <input
              type="text"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="اكتب سؤال الاستطلاع..."
              maxLength={200}
              className="w-full bg-muted/30 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}.</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updatePollOption(opt.id, e.target.value)}
                    placeholder={`خيار ${i + 1}`}
                    maxLength={80}
                    className="flex-1 bg-muted/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => removePollOption(opt.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 6 && (
              <button
                onClick={addPollOption}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                إضافة خيار
              </button>
            )}
            <div className="flex items-center gap-4 pt-1 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={(e) => setPollAllowMultiple(e.target.checked)}
                  className="rounded"
                />
                <span>سماح بأكثر من اختيار</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>ينتهي بعد</span>
                <select
                  value={pollDurationHours}
                  onChange={(e) => setPollDurationHours(Number(e.target.value))}
                  className="bg-muted/30 rounded px-2 py-1 text-xs"
                >
                  <option value={1}>ساعة</option>
                  <option value={6}>6 ساعات</option>
                  <option value={24}>يوم</option>
                  <option value={72}>3 أيام</option>
                  <option value={168}>أسبوع</option>
                  <option value={720}>شهر</option>
                </select>
              </label>
            </div>
            {/* Optional context */}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="وصف أو سياق للاستطلاع (اختياري)..."
              rows={2}
              maxLength={500}
              className="resize-none bg-transparent border-0 focus-visible:ring-0 text-sm"
            />
          </div>
        )}

        {/* === Link UI === */}
        {mode === 'link' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/article"
                dir="ltr"
                className="flex-1 bg-muted/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              {linkFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <AnimatePresence>
              {linkPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  {linkPreview.image && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={linkPreview.image}
                        alt={linkPreview.title || 'Link preview'}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {linkPreview.siteName || 'رابط'}
                    </div>
                    {linkPreview.title && (
                      <div className="text-sm font-medium line-clamp-2">{linkPreview.title}</div>
                    )}
                    {linkPreview.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{linkPreview.description}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Image preview (text/image mode only) */}
        <AnimatePresence>
          {image && mode === 'text' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative mt-3 overflow-hidden rounded-xl"
            >
              <img src={image} alt="Preview" className="w-full max-h-64 object-cover" loading="lazy" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 hover:bg-black/80"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex gap-1 items-center flex-wrap">
            {mode === 'text' && (
              <label className="cursor-pointer p-2 hover:bg-muted/40 rounded-full transition">
                <ImageIcon className="h-5 w-5 text-primary" />
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
            )}
            {/* Privacy selector */}
            <div className="flex gap-1 items-center bg-muted/30 rounded-full p-1">
              <button
                onClick={() => setPrivacy('public')}
                className={cn('p-1.5 rounded-full transition', privacy === 'public' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
                title="عام"
              >
                <Globe className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPrivacy('friends')}
                className={cn('p-1.5 rounded-full transition', privacy === 'friends' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
                title="الأصدقاء"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPrivacy('private')}
                className={cn('p-1.5 rounded-full transition', privacy === 'private' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
                title="خاص"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
            {/* Schedule */}
            {scheduleAt && (
              <span className="text-[10px] text-amber-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(scheduleAt).toLocaleString('ar-EG')}
              </span>
            )}
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="text-[10px] bg-muted/30 rounded px-2 py-1 text-muted-foreground"
            />
          </div>
          <Button
            onClick={submit}
            disabled={!canSubmit()}
            size="sm"
            className="gap-2 rounded-full px-6"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            نشر
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
