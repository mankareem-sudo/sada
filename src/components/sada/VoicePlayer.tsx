'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const

interface VoicePlayerProps {
  src: string
  durationSec: number
  onPlayedOnce?: () => void
  className?: string
  accent?: 'primary' | 'accent'
}

export function VoicePlayer({
  src,
  durationSec,
  onPlayedOnce,
  className,
  accent = 'primary',
}: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [currentSec, setCurrentSec] = useState(0)
  const [speed, setSpeed] = useState<number>(1)
  const [hasReportedPlay, setHasReportedPlay] = useState(false)
  const [bars] = useState(() =>
    Array.from({ length: 36 }, () => 30 + Math.random() * 70)
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTime = () => {
      setCurrentSec(audio.currentTime)
      const total = audio.duration || durationSec
      if (total > 0) setProgress(audio.currentTime / total)
    }
    const handleEnd = () => {
      setPlaying(false)
      setProgress(0)
      setCurrentSec(0)
    }
    const handlePlay = () => {
      setPlaying(true)
      if (!hasReportedPlay) {
        onPlayedOnce?.()
        setHasReportedPlay(true)
      }
    }
    const handlePause = () => setPlaying(false)

    audio.addEventListener('timeupdate', handleTime)
    audio.addEventListener('ended', handleEnd)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTime)
      audio.removeEventListener('ended', handleEnd)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [durationSec, hasReportedPlay, onPlayedOnce])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      if (playing) {
        audio.pause()
      } else {
        await audio.play()
      }
    } catch (e) {
      console.error('audio play error', e)
    }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    // RTL: right side is start
    const ratio = (rect.right - e.clientX) / rect.width
    const total = audio.duration || durationSec
    audio.currentTime = Math.max(0, Math.min(total, ratio * total))
    setProgress(ratio)
  }

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(speed as 1 | 1.25 | 1.5 | 2)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const accentClasses =
    accent === 'accent'
      ? 'bg-accent text-accent-foreground hover:bg-accent/90'
      : 'bg-primary text-primary-foreground hover:bg-primary/90'

  return (
    <div className={cn('flex items-center gap-3 w-full', className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={toggle}
        className={cn(
          'shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition shadow-md',
          accentClasses
        )}
        aria-label={playing ? 'إيقاف' : 'تشغيل'}
      >
        {playing ? (
          <Pause className="h-5 w-5" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Waveform */}
        <div
          onClick={seek}
          dir="ltr"
          className="flex items-center gap-[2px] h-10 cursor-pointer select-none"
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors',
                  filled ? 'bg-primary' : 'bg-muted-foreground/40'
                )}
                style={{ height: `${h}%` }}
              />
            )
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1 tabular-nums">
          <span>{formatDuration(currentSec)}</span>
          <button
            onClick={cycleSpeed}
            className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70 font-mono transition"
            aria-label="تغيير السرعة"
          >
            {speed}x
          </button>
          <span>{formatDuration(durationSec)}</span>
        </div>
      </div>
    </div>
  )
}
