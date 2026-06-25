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
  /** Title shown in OS media controls (lock screen / notification) */
  title?: string
  /** Artist/author name shown in OS media controls */
  artist?: string
  /** Album/source shown in OS media controls */
  album?: string
  /** Artwork URL for OS media controls */
  artworkUrl?: string
}

declare global {
  interface Navigator {
    mediaSession?: any
  }
  interface Window {
    MediaMetadata?: any
  }
}

export function VoicePlayer({
  src,
  durationSec,
  onPlayedOnce,
  className,
  accent = 'primary',
  title,
  artist,
  album = 'صدى',
  artworkUrl,
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

  // === MediaSession API: Background Playback ===
  // Sets metadata so OS shows title/artist/artwork on lock screen + notification
  // Enables hardware media keys (play/pause/seek) and Bluetooth controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return
    if (!title && !artist) return

    try {
      const metadata = new window.MediaMetadata({
        title: title || 'تسجيل صوتي',
        artist: artist || 'صدى',
        album,
        artwork: artworkUrl
          ? [
              { src: artworkUrl, sizes: '96x96', type: 'image/png' },
              { src: artworkUrl, sizes: '128x128', type: 'image/png' },
              { src: artworkUrl, sizes: '192x192', type: 'image/png' },
              { src: artworkUrl, sizes: '256x256', type: 'image/png' },
              { src: artworkUrl, sizes: '512x512', type: 'image/png' },
            ]
          : [],
      })
      navigator.mediaSession.metadata = metadata
    } catch (e) {
      console.warn('MediaMetadata error', e)
    }
  }, [title, artist, album, artworkUrl])

  // === MediaSession action handlers ===
  // Wire up play/pause/seekto so hardware buttons work
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return
    const audio = audioRef.current
    if (!audio) return

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        audio.play().catch(() => {})
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause()
      })
      navigator.mediaSession.setActionHandler('seekbackward', (details: any) => {
        const skip = details?.seekOffset || 10
        audio.currentTime = Math.max(0, audio.currentTime - skip)
      })
      navigator.mediaSession.setActionHandler('seekforward', (details: any) => {
        const skip = details?.seekOffset || 10
        const total = audio.duration || durationSec
        audio.currentTime = Math.min(total, audio.currentTime + skip)
      })
      navigator.mediaSession.setActionHandler('seekto', (details: any) => {
        if (typeof details?.seekTime === 'number') {
          audio.currentTime = details.seekTime
        }
      })
      navigator.mediaSession.setActionHandler('stop', () => {
        audio.pause()
        audio.currentTime = 0
      })
    } catch (e) {
      // Some browsers don't support all handlers — ignore
    }

    return () => {
      try {
        // Clear handlers on unmount
        if (navigator.mediaSession) {
          navigator.mediaSession.setActionHandler('play', null)
          navigator.mediaSession.setActionHandler('pause', null)
          navigator.mediaSession.setActionHandler('seekbackward', null)
          navigator.mediaSession.setActionHandler('seekforward', null)
          navigator.mediaSession.setActionHandler('seekto', null)
          navigator.mediaSession.setActionHandler('stop', null)
        }
      } catch {}
    }
  }, [durationSec])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTime = () => {
      setCurrentSec(audio.currentTime)
      const total = audio.duration || durationSec
      if (total > 0) setProgress(audio.currentTime / total)
      // Update MediaSession position state (for OS to show progress bar)
      if (typeof navigator !== 'undefined' && navigator.mediaSession?.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration || durationSec,
            position: audio.currentTime,
            playbackRate: audio.playbackRate || 1,
          })
        } catch {}
      }
    }
    const handleEnd = () => {
      setPlaying(false)
      setProgress(0)
      setCurrentSec(0)
      if (typeof navigator !== 'undefined' && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'none'
      }
    }
    const handlePlay = () => {
      setPlaying(true)
      if (typeof navigator !== 'undefined' && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing'
      }
      if (!hasReportedPlay) {
        onPlayedOnce?.()
        setHasReportedPlay(true)
      }
    }
    const handlePause = () => {
      setPlaying(false)
      if (typeof navigator !== 'undefined' && navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'paused'
      }
    }

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
