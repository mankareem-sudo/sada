'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mic, Sparkles, Calendar } from 'lucide-react'
import { useSada } from '@/lib/store'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { formatArabicDate, formatCount, timeAgo } from '@/lib/format'
import type { SadaVoiceNote } from '@/lib/types'

export function TodayView() {
  const todayPrompt = useSada((s) => s.todayPrompt)
  const setTodayPrompt = useSada((s) => s.setTodayPrompt)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const setTab = useSada((s) => s.setTab)
  const user = useSada((s) => s.user)

  const [todaysVoices, setTodaysVoices] = useState<SadaVoiceNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!todayPrompt) {
      fetch('/api/prompts/today')
        .then((r) => r.json())
        .then((d) => {
          if (d.prompt) setTodayPrompt(d.prompt)
        })
        .catch(() => {})
    }
  }, [todayPrompt, setTodayPrompt])

  useEffect(() => {
    if (!todayPrompt) {
      return
    }
    let cancelled = false
    fetch(`/api/voice-notes/discover?promptId=${todayPrompt.id}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setTodaysVoices(d.notes || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [todayPrompt])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Today's prompt card */}
      {todayPrompt && (
        <Card className="p-6 rounded-3xl border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card sada-fade-up">
          <div className="flex items-center gap-2 text-xs text-primary/80 mb-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>سؤال اليوم · {formatArabicDate(todayPrompt.date)}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-cairo leading-snug mb-5">
            {todayPrompt.text}
          </h2>

          <Button
            onClick={() => setRecorderOpen(true)}
            size="lg"
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-medium"
          >
            <Mic className="h-5 w-5" />
            سجّل إجابتك الصوتية
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-3">
            90 ثانية كحد أقصى · صوتك بنبرة طبيعية
          </p>
        </Card>
      )}

      {!todayPrompt && (
        <Card className="p-8 rounded-3xl text-center">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            مفيش سؤال لليوم دلوقتي، ارجع قريب.
          </p>
        </Card>
      )}
      {/* Today's voices */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold text-sm">
            أحدث الإجابات لهذا السؤال
          </h3>
          {todaysVoices.length > 0 && (
            <button
              onClick={() => setTab('discover')}
              className="text-xs text-primary hover:underline"
            >
              عرض الكل
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : todaysVoices.length === 0 ? (
          <Card className="p-6 text-center rounded-2xl border-dashed">
            <p className="text-sm text-muted-foreground mb-4">
              لسه مفيش حد سجل إجابة. كن أول واحد! 🎙️
            </p>
            <Button
              onClick={() => setRecorderOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              ابدأ أنت
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaysVoices.slice(0, 5).map((n) => (
              <Card key={n.id} className="p-4 sada-glass rounded-2xl sada-fade-up">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar
                    name={n.user?.name || user?.name || '?'}
                    color={n.user?.avatarColor || user?.avatarColor || '#888'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {n.user?.name || user?.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {timeAgo(n.createdAt)} · {formatCount(n.plays)} تشغيل
                    </div>
                  </div>
                </div>
                <VoicePlayer
                  src={n.audioData}
                  durationSec={n.durationSec}
                />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
