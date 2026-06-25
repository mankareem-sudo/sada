'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Mic, Square, Trash2, Send, X } from 'lucide-react'
import { formatDuration } from '@/lib/format'
import { toast } from 'sonner'

const MAX_DURATION = 90

interface VoiceRecorderProps {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  promptId?: string | null
  promptDate?: string
  promptText?: string
  /** 'voice-note' (default) = regular voice note, 'story' = 24h voice story */
  mode?: 'voice-note' | 'story'
}

type Phase = 'idle' | 'recording' | 'reviewing' | 'uploading'

export function VoiceRecorder({
  open,
  onClose,
  onSubmitted,
  promptId,
  promptDate,
  promptText,
  mode = 'voice-note',
}: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [audioData, setAudioData] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string>('audio/webm')
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(20).fill(20))
  const [description, setDescription] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // --- Stop recording (declared BEFORE useEffects that use it) ---
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  // --- Audio level visualizer (uses ref to itself to avoid cycle) ---
  const updateAudioLevelRef = useRef<() => void>(() => {})

  useEffect(() => {
    updateAudioLevelRef.current = () => {
      if (!analyserRef.current) return
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      const bars: number[] = []
      const step = Math.max(1, Math.floor(dataArray.length / 40))
      for (let i = 0; i < 20; i++) {
        const v = dataArray[i * step] || 0
        bars.push(20 + (v / 255) * 80)
      }
      setAudioLevel(bars)
      rafRef.current = requestAnimationFrame(() => updateAudioLevelRef.current())
    }
  }, [])

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  // --- Reset state when modal opens ---
  // Using a ref-guarded reset so we don't call setState on every render cycle
  const lastOpenRef = useRef(false)
  useEffect(() => {
    if (open && !lastOpenRef.current) {
      // Reset via fresh mount — caller uses `key` to remount.
      // No synchronous setState here.
    }
    lastOpenRef.current = open
  }, [open])

  // --- Auto-stop at max duration ---
  useEffect(() => {
    if (phase === 'recording' && elapsed >= MAX_DURATION) {
      stopRecording()
    }
  }, [elapsed, phase, stopRecording])

  // --- Start recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]
      let chosenType = 'audio/webm'
      for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) {
          chosenType = t
          break
        }
      }
      setMimeType(chosenType)

      const recorder = new MediaRecorder(stream, { mimeType: chosenType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chosenType })
        const reader = new FileReader()
        reader.onloadend = () => {
          setAudioData(reader.result as string)
          setPhase('reviewing')
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      analyserRef.current = analyser
      rafRef.current = requestAnimationFrame(() => updateAudioLevelRef.current())

      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
      }, 1000)

      setPhase('recording')
    } catch (e: any) {
      console.error('Recording error', e)
      if (e?.name === 'NotAllowedError') {
        toast.error('مسموحش باستخدام الميكروفون. فعّل الإذن من إعدادات المتصفح — علامة القفل 🔒 جنب الـ URL', {
          duration: 6000,
          action: { label: 'إعادة المحاولة', onClick: () => startRecording() },
        })
      } else if (e?.name === 'NotFoundError') {
        toast.error('مفيش ميكروفون متاح. لو على كمبيوتر، تأكد إن الميكروفون متصل', {
          duration: 6000,
          action: { label: 'إعادة المحاولة', onClick: () => startRecording() },
        })
      } else {
        toast.error('المتصفح مش بيدعم التسجيل. جرّب Chrome أو Firefox', {
          duration: 6000,
          action: { label: 'إعادة المحاولة', onClick: () => startRecording() },
        })
      }
    }
  }

  const discardRecording = () => {
    setAudioData(null)
    setPhase('idle')
    setElapsed(0)
    setAudioLevel(new Array(20).fill(20))
  }

  const submitRecording = async () => {
    if (!audioData) return
    setPhase('uploading')
    try {
      const endpoint = mode === 'story' ? '/api/stories/create' : '/api/voice-notes/create'
      const payload: any = {
        audioData,
        mimeType,
        durationSec: elapsed,
      }
      if (mode === 'voice-note') {
        payload.promptId = promptId || undefined
        payload.promptDate = promptDate || undefined
        payload.description = description.trim() || undefined
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل حفظ التسجيل')
        setPhase('reviewing')
        return
      }
      toast.success(mode === 'story' ? 'تم نشر ستوريك 🎙️' : 'تم نشر صدى صوتك 🎙️')
      setDescription('')
      onSubmitted()
      onClose()
    } catch (e) {
      console.error('Submit error', e)
      toast.error('فشل رفع التسجيل. حاول مرة تانية')
      setPhase('reviewing')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="sada-glass w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl sada-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-cairo">
            {phase === 'reviewing' ? 'راجع تسجيلك' : 'سجّل صدى صوتك'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {promptText && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary-foreground/90">
            <div className="text-xs text-muted-foreground mb-1">السؤال:</div>
            <div className="font-medium">{promptText}</div>
          </div>
        )}

        {/* Body */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <button
              onClick={startRecording}
              className="sada-recording w-24 h-24 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center text-primary-foreground transition shadow-xl"
              aria-label="ابدأ التسجيل"
            >
              <Mic className="h-10 w-10" />
            </button>
            <p className="text-sm text-muted-foreground text-center">
              اضغط على الميكروفون للبدء
              <br />
              <span className="text-xs">اقصى مدة {MAX_DURATION} ثانية</span>
            </p>
          </div>
        )}

        {phase === 'recording' && (
          <div className="flex flex-col items-center py-6 gap-6">
            {/* Equalizer */}
            <div className="flex items-end justify-center gap-1 h-20 w-full max-w-xs">
              {audioLevel.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary rounded-t-full transition-all duration-100"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="text-3xl font-bold font-cairo tabular-nums">
              {formatDuration(elapsed)}
              <span className="text-base text-muted-foreground"> / {formatDuration(MAX_DURATION)}</span>
            </div>

            <Button
              onClick={stopRecording}
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14 p-0"
              aria-label="إيقاف التسجيل"
            >
              <Square className="h-5 w-5" fill="currentColor" />
            </Button>
            <p className="text-xs text-muted-foreground">اضغط للإيقاف والمراجعة</p>
          </div>
        )}

        {phase === 'reviewing' && audioData && (
          <div className="flex flex-col items-stretch py-4 gap-5">
            <audio
              ref={previewAudioRef}
              src={audioData}
              controls
              className="w-full"
            />

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                وصف اختياري (يساعد الناس يلاقوا صداك)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: تجربتي الأولى مع تعلم البرمجة..."
                rows={2}
                maxLength={280}
                className="resize-none text-sm"
              />
              <div className="text-[10px] text-muted-foreground text-left">
                {description.length}/280
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                onClick={discardRecording}
                variant="outline"
                className="flex-1 gap-2"
                disabled={phase !== 'reviewing'}
              >
                <Trash2 className="h-4 w-4" />
                إعادة التسجيل
              </Button>
              <Button
                onClick={submitRecording}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                disabled={phase !== 'reviewing'}
              >
                <Send className="h-4 w-4" />
                نشر
              </Button>
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">جاري النشر...</p>
          </div>
        )}
      </div>
    </div>
  )
}
