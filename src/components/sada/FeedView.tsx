'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSada } from '@/lib/store'
import { VoiceNoteCard } from './VoiceNoteCard'
import { Button } from '@/components/ui/button'
import { Users2 } from 'lucide-react'
import type { SadaVoiceNote } from '@/lib/types'

export function FeedView({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [notes, setNotes] = useState<SadaVoiceNote[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const setTab = useSada((s) => s.setTab)

  const load = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
      setCursor(null)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const url = `/api/voice-notes/feed?limit=15${
        !reset && cursor ? `&cursor=${cursor}` : ''
      }`
      const res = await fetch(url)
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
  }, [cursor])

  useEffect(() => {
    load(true)
  }, [load])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 pb-28">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">الـ feed بتاعك لسه فاضي</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            ابدأ بمتابعة أصحاب من صفحة الاكتشاف، وهتلاقي أحدث صدى صوتهم هنا.
          </p>
          <Button onClick={() => setTab('discover')} className="gap-2">
            استكشف أصوات جديدة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-4">
      <h2 className="font-bold text-lg mb-2">صدى اللي بتتابعهم</h2>
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
            onClick={() => load(false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'جاري...' : 'تحميل المزيد'}
          </Button>
        </div>
      )}
    </div>
  )
}
