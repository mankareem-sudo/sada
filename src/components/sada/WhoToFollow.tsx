'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { UserPlus, X } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'

interface Suggestion {
  id: string
  name: string
  username: string
  avatarColor: string
  avatarUrl?: string | null
  bio?: string | null
}

export function WhoToFollow({ onOpenProfile }: { onOpenProfile: (username: string) => void }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const user = useSada((s) => s.user)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setTab = useSada((s) => s.setTab)

  useEffect(() => {
    if (!user) return
    fetch('/api/users/suggestions')
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const follow = async (id: string) => {
    setFollowed(prev => new Set(prev).add(id))
    try {
      await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: id, action: 'follow' }),
      })
      toast.success('تمت المتابعة')
    } catch { toast.error('فشل') }
  }

  if (dismissed || loading || suggestions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-4 sada-glass rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">أشخاص قد تعرفهم</h3>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-muted/40 rounded-full">
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {suggestions.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <button
                onClick={() => { setViewedUsername(s.username); setTab('profile') }}
                className="flex items-center gap-3 flex-1 min-w-0 group"
              >
                <Avatar name={s.name} color={s.avatarColor} imageUrl={s.avatarUrl} size="md" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="font-medium text-sm group-hover:underline truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{s.username}</div>
                </div>
              </button>
              <Button
                size="sm"
                variant={followed.has(s.id) ? 'outline' : 'default'}
                onClick={() => follow(s.id)}
                disabled={followed.has(s.id)}
                className="shrink-0 h-8 px-3 text-xs gap-1"
              >
                {followed.has(s.id) ? 'متابع' : <><UserPlus className="h-3 w-3" /> متابعة</>}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
