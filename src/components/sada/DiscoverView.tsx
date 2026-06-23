'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSada } from '@/lib/store'
import { VoiceNoteCard } from './VoiceNoteCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar, RefreshCcw } from 'lucide-react'
import type { SadaVoiceNote, SadaPrompt } from '@/lib/types'
import { formatArabicDate } from '@/lib/format'

export function DiscoverView({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [notes, setNotes] = useState<SadaVoiceNote[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [prompts, setPrompts] = useState<SadaPrompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'voice' | 'text'>('all')

  const load = useCallback(
    async (reset = false, promptId: string | null = null) => {
      if (reset) {
        setLoading(true)
        setCursor(null)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }
      try {
        const params = new URLSearchParams({ limit: '20' })
        if (!reset && cursor) params.set('cursor', cursor)
        if (promptId) params.set('promptId', promptId)
        const res = await fetch(`/api/voice-notes/discover?${params.toString()}`)
        const data = await res.json()
        const newNotes = data.notes || []
        setNotes((prev) => (reset ? newNotes : [...prev, ...newNotes]))
        setCursor(data.nextCursor)
        setHasMore(!!data.nextCursor)
      } catch {
        // ignore
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [cursor]
  )

  useEffect(() => {
    fetch('/api/prompts/list')
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load(true, selectedPrompt)
  }, [selectedPrompt, load])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      <div>
        <h2 className="font-bold text-lg mb-1">اكتشف أصوات</h2>
        <p className="text-sm text-muted-foreground">
          استمع لإجابات الناس على أسئلة الأيام الماضية
        </p>
      </div>

      {/* Prompt selector + Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          <button
            onClick={() => setSelectedPrompt(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition border ${
              !selectedPrompt
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:border-primary/50'
            }`}
          >
            الكل
          </button>
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPrompt(p.id)}
              className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium transition border flex items-center gap-1.5 max-w-[200px] ${
                selectedPrompt === p.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.text}</span>
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'voice', label: '🎙️ أصوات' },
            { key: 'text', label: '📝 نصوص' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f.key ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card className="p-8 text-center rounded-2xl border-dashed">
          <p className="text-sm text-muted-foreground mb-4">
            مفيش أصوات في هذا القسم لسه.
          </p>
          <Button variant="outline" onClick={() => load(true, selectedPrompt)} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            تحديث
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((n) => (
            <VoiceNoteCard
              key={n.id}
              note={n}
              showAuthor
              onOpenProfile={onOpenProfile}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => load(false, selectedPrompt)}
                disabled={loadingMore}
              >
                {loadingMore ? 'جاري...' : 'تحميل المزيد'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
