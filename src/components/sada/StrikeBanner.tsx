'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, VolumeX, X, AlertTriangle } from 'lucide-react'
import { useSada } from '@/lib/store'

interface StrikeStatus {
  strikeCount: number
  currentPenalty: 'none' | 'mute' | 'ban'
  penaltyEndsAt: string | null
  unacknowledgedCount: number
  latestWarning: {
    id: string
    reason: string
    category: string
    severity: string
  } | null
}

export function StrikeBanner() {
  const user = useSada((s) => s.user)
  const [status, setStatus] = useState<StrikeStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    const check = async () => {
      try {
        const res = await fetch('/api/users/strike-status')
        if (res.ok) {
          const data = await res.json()
          if (active) setStatus(data)
        }
      } catch {}
    }
    check()
    // Poll every 60s while mounted
    const interval = setInterval(check, 60000)
    return () => { active = false; clearInterval(interval) }
  }, [user])

  if (!user || !status || dismissed) return null

  // Active penalty (mute/ban) — always show, can't dismiss
  if (status.currentPenalty === 'ban' || status.currentPenalty === 'mute') {
    const isBan = status.currentPenalty === 'ban'
    const endsAt = status.penaltyEndsAt
      ? new Date(status.penaltyEndsAt).toLocaleString('ar-EG')
      : 'دائم'
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 px-4 py-2 bg-destructive/15 border-b border-destructive/30 backdrop-blur-md"
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3 text-sm">
          {isBan ? (
            <Ban className="h-4 w-4 text-destructive shrink-0" />
          ) : (
            <VolumeX className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">
              {isBan ? 'تم حظر حسابك' : 'تم كتم حسابك'}
            </p>
            <p className="text-xs text-muted-foreground">
              حتى: {endsAt}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Unacknowledged warning — show banner, can dismiss
  if (status.unacknowledgedCount > 0 && status.latestWarning) {
    const acknowledge = async () => {
      try {
        await fetch('/api/users/warnings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ warningId: status.latestWarning!.id }),
        })
        setDismissed(true)
      } catch {}
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                تحذير إداري ({status.strikeCount}/5)
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {status.latestWarning.reason}
              </p>
            </div>
            <button
              onClick={acknowledge}
              className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition shrink-0"
            >
              فهمت
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-amber-500/20 rounded-full transition shrink-0"
            >
              <X className="h-3 w-3 text-amber-700 dark:text-amber-400" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return null
}
