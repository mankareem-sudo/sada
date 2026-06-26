'use client'

import { useState } from 'react'
import { Check, Loader2, BarChart3, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'

interface PollOption {
  id: string
  text: string
}

interface PollViewProps {
  postId: string
  question: string
  options: PollOption[] | string
  totals: Record<string, number>
  myVotes: string[]
  totalVotes: number
  allowMultiple: boolean
  expiresAt?: string | null
}

export function PollView({
  postId,
  question,
  options: rawOptions,
  totals: initialTotals,
  myVotes: initialMyVotes,
  totalVotes: initialTotalVotes,
  allowMultiple,
  expiresAt,
}: PollViewProps) {
  // Parse options if stringified JSON
  let options: PollOption[] = []
  if (Array.isArray(rawOptions)) {
    options = rawOptions as PollOption[]
  } else if (typeof rawOptions === 'string') {
    try { options = JSON.parse(rawOptions) } catch { options = [] }
  }

  const [totals, setTotals] = useState<Record<string, number>>(initialTotals)
  const [myVotes, setMyVotes] = useState<string[]>(initialMyVotes)
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes)
  const [voting, setVoting] = useState<string | null>(null)

  const hasVoted = myVotes.length > 0
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const showResults = hasVoted || isExpired

  const vote = async (optionId: string) => {
    if (voting || isExpired) return
    if (!allowMultiple && hasVoted) return
    setVoting(optionId)
    try {
      const res = await fetch('/api/posts/poll/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, optionId }),
      })
      const data = await res.json()
      if (data.totals) {
        setTotals(data.totals)
        setTotalVotes(data.totalVotes || 0)
        // Update myVotes based on whether the user toggled on or off
        const newMyVotes = options
          .map(o => o.id)
          .filter(id => {
            const wasMine = myVotes.includes(id)
            const hasCount = (data.totals[id] || 0) > 0
            // Heuristic: if previously mine and count went to 0, removed; if not mine and now has count, added
            // Simpler: assume the action toggled optionId; trust server response
            if (id === optionId) {
              return wasMine ? false : true  // toggled
            }
            return wasMine
          })
        setMyVotes(newMyVotes)
      }
    } catch (e) {
      console.error('Vote failed', e)
    } finally {
      setVoting(null)
    }
  }

  const maxCount = Math.max(1, ...Object.values(totals))

  return (
    <div className="px-4 pb-3">
      <div className="rounded-xl border border-border bg-card/30 p-4">
        <div className="flex items-start gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">{question}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              <span>
                {allowMultiple ? 'متعدد الاختيار' : 'اختيار واحد'}
                {' · '}
                {totalVotes} صوت
              </span>
              {expiresAt && (
                <>
                  {' · '}
                  <span className={cn('flex items-center gap-1', isExpired && 'text-destructive')}>
                    <Clock className="h-2.5 w-2.5" />
                    {isExpired ? 'انتهى' : `ينتهي ${timeAgo(expiresAt)}`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {options.map((opt) => {
            const count = totals[opt.id] || 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const isMine = myVotes.includes(opt.id)
            const widthPct = showResults ? (count / maxCount) * 100 : 0

            return (
              <button
                key={opt.id}
                onClick={() => vote(opt.id)}
                disabled={!!voting || isExpired || (!allowMultiple && hasVoted)}
                className={cn(
                  'relative w-full text-right p-3 rounded-lg border transition overflow-hidden',
                  'disabled:cursor-default',
                  isMine
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30',
                  !showResults && 'cursor-pointer',
                )}
              >
                {/* Result bar background */}
                {showResults && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={cn(
                      'absolute inset-y-0 right-0',
                      isMine ? 'bg-primary/10' : 'bg-muted/40'
                    )}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    {isMine && <Check className="h-3.5 w-3.5 text-primary" />}
                    {opt.text}
                  </span>
                  {showResults && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  )}
                  {voting === opt.id && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {!showResults && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {allowMultiple ? 'اختر خياراً أو أكثر للتصويت' : 'اختر خياراً للتصويت'}
          </p>
        )}
      </div>
    </div>
  )
}
