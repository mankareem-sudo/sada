'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSada } from '@/lib/store'
import { VoiceNoteCard } from './VoiceNoteCard'
import { Card } from '@/components/ui/card'
import { Bookmark } from 'lucide-react'
import type { SadaVoiceNote } from '@/lib/types'

export function BookmarksView({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [notes, setNotes] = useState<SadaVoiceNote[]>([])
  const [loading, setLoading] = useState(true)
  const setTab = useSada((s) => s.setTab)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookmarks')
      const data = await res.json()
      setNotes(data.notes || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      <div>
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          المحفوظات
        </h2>
        <p className="text-sm text-muted-foreground">
          الأصداء اللي حفظتها للرجوع ليها بعدين
        </p>
      </div>

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
        <Card className="p-10 text-center rounded-2xl border-dashed">
          <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            لسه ماحفظتش أي صدى.
            <br />
            اضغط على أيقونة الحفظ (🔖) على أي تسجيل عشان يبقى هنا.
          </p>
          <button
            onClick={() => setTab('discover')}
            className="text-sm text-primary hover:underline"
          >
            استكشف أصداء جديدة
          </button>
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
        </div>
      )}
    </div>
  )
}
