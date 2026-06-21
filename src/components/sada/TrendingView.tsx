'use client'

import { useEffect, useState } from 'react'
import { useSada } from '@/lib/store'
import { VoiceNoteCard } from './VoiceNoteCard'
import { Card } from '@/components/ui/card'
import { Flame, TrendingUp } from 'lucide-react'
import type { SadaVoiceNote } from '@/lib/types'

export function TrendingView({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [notes, setNotes] = useState<SadaVoiceNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/voice-notes/trending')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setNotes(d.notes || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      <div>
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          رائج هذا الأسبوع
        </h2>
        <p className="text-sm text-muted-foreground">
          الأكثر سماعاً وتفاعلاً خلال الـ 7 أيام الماضية
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
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            لسه مفيش أصداء رائجة هذا الأسبوع.
            <br />
            سجّل صدى وخلّيه يكون أول واحد!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((n, i) => (
            <div key={n.id} className="relative">
              {i < 3 && (
                <div className="absolute -top-2 right-3 z-10 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                  #{i + 1} رائج
                </div>
              )}
              <VoiceNoteCard
                note={n}
                showAuthor
                onOpenProfile={onOpenProfile}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
