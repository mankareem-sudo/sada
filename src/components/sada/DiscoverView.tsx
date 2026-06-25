'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSada } from '@/lib/store'
import { VoiceNoteCard } from './VoiceNoteCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from './Avatar'
import { Calendar, RefreshCcw, Sparkles, Mic, FileText } from 'lucide-react'
import type { SadaVoiceNote, SadaPrompt } from '@/lib/types'
import { formatArabicDate, timeAgo } from '@/lib/format'

interface Recommendation {
  id: string
  type: 'voice' | 'post'
  title: string
  authorId: string
  createdAt: string
  score: number
  reason: string
  author: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
    isVerified?: boolean
  } | null
}

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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecs, setLoadingRecs] = useState(true)

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

  const loadRecommendations = useCallback(async () => {
    setLoadingRecs(true)
    try {
      const res = await fetch('/api/discover/recommendations?limit=8')
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch {
      // ignore
    } finally {
      setLoadingRecs(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/prompts/list')
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts || []))
      .catch(() => {})
    loadRecommendations()
  }, [loadRecommendations])

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

      {/* === AI Recommendations === */}
      {!selectedPrompt && (
        <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">مقترحات لك</h3>
            </div>
            <button
              onClick={loadRecommendations}
              className="text-xs text-muted-foreground hover:text-foreground transition"
              title="تحديث المقترحات"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingRecs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              تابع ناس وتفاعل مع أصوات عشان نوصفلك محتوى يناسبك
            </p>
          ) : (
            <div className="space-y-1.5">
              {recommendations.map((rec) => (
                <button
                  key={`${rec.type}-${rec.id}`}
                  onClick={() => rec.author && onOpenProfile(rec.author.username)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition text-right group"
                >
                  {rec.author && (
                    <Avatar
                      name={rec.author.name}
                      color={rec.author.avatarColor}
                      imageUrl={rec.author.avatarUrl}
                      size="sm"
                      isVerified={rec.author.isVerified}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {rec.type === 'voice' ? (
                        <Mic className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-primary shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate group-hover:text-primary transition">
                        {rec.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>{rec.author?.name || 'مستخدم'}</span>
                      <span>·</span>
                      <span>{timeAgo(rec.createdAt)}</span>
                      <span>·</span>
                      <span className="text-primary/80">{rec.reason}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

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
