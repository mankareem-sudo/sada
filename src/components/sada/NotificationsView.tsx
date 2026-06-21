'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSada } from '@/lib/store'
import { Avatar } from './Avatar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Heart, UserPlus, MessageCircle, Mic, Check } from 'lucide-react'
import { timeAgo } from '@/lib/format'
import type { SadaNotification } from '@/lib/types'
import { toast } from 'sonner'

const ICONS: Record<string, any> = {
  like: Heart,
  follow: UserPlus,
  comment: MessageCircle,
  voice_note: Mic,
  system: Bell,
}

const COLORS: Record<string, string> = {
  like: 'text-pink-500',
  follow: 'text-emerald-500',
  comment: 'text-blue-400',
  voice_note: 'text-primary',
  system: 'text-amber-500',
}

export function NotificationsView({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const [notifications, setNotifications] = useState<SadaNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const setUnread = useSada((s) => s.setUnreadNotifications)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=50')
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnread(0)
      toast.success('تم تحديد الكل كمقروء')
    } catch {
      toast.error('فشل')
    } finally {
      setMarkingAll(false)
    }
  }

  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">الإشعارات</h2>
          <p className="text-xs text-muted-foreground">
            كل تفاعلاتك في مكان واحد
          </p>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl border-dashed">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            مفيش إشعارات لسه.
            <br />
            لما حد يعمل لايك أو يتابعك أو يعلّق على صداك، هتلاقيه هنا.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICONS[n.type] || Bell
            const color = COLORS[n.type] || 'text-muted-foreground'
            return (
              <Card
                key={n.id}
                className={`p-3 sada-glass rounded-2xl flex items-center gap-3 transition ${
                  !n.read ? 'border-primary/40 bg-primary/5' : ''
                }`}
              >
                <div className="relative">
                  <Avatar
                    name={n.actor.name}
                    color={n.actor.avatarColor}
                    size="md"
                  />
                  <div
                    className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-background flex items-center justify-center ${color}`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                </div>

                <button
                  onClick={() => onOpenProfile(n.actor.username)}
                  className="flex-1 text-right min-w-0"
                >
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{n.actor.name}</span>
                    <span className="text-muted-foreground"> · {n.text.replace(n.actor.name, '').trim()}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {timeAgo(n.createdAt)}
                  </p>
                </button>

                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
