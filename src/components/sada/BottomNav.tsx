'use client'

import { useSada } from '@/lib/store'
import {
  Sparkles,
  Home,
  Compass,
  User,
  Plus,
  Bell,
  Flame,
  Bookmark,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabKey } from '@/lib/types'

export function BottomNav() {
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setSearchOpen = useSada((s) => s.setSearchOpen)
  const unread = useSada((s) => s.unreadNotifications)
  const user = useSada((s) => s.user)

  const onTabClick = (t: TabKey) => {
    if (t === 'profile') setViewedUsername(null)
    setTab(t)
  }

  // Build tab list dynamically based on admin status
  const leftTabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'today', label: 'اليوم', icon: Sparkles },
    { key: 'feed', label: 'الرئيسية', icon: Home },
    { key: 'trending', label: 'رائج', icon: Flame },
    { key: 'bookmarks', label: 'محفوظات', icon: Bookmark },
  ]

  const rightTabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'discover', label: 'اكتشف', icon: Compass },
    { key: 'notifications', label: 'إشعارات', icon: Bell },
    { key: 'profile', label: 'حسابي', icon: User },
  ]

  if (user?.isAdmin) {
    rightTabs.push({ key: 'admin', label: 'إدارة', icon: Shield })
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-2xl mx-auto px-2 pb-2 pointer-events-auto">
        <div className="sada-glass rounded-2xl shadow-2xl flex items-center justify-between p-1.5 relative overflow-x-auto no-scrollbar">
          {/* Left tabs */}
          {leftTabs.map((t) => (
            <NavButton
              key={t.key}
              active={tab === t.key}
              icon={t.icon}
              label={t.label}
              onClick={() => onTabClick(t.key)}
            />
          ))}

          {/* Center record button */}
          <button
            onClick={() => setRecorderOpen(true)}
            className="shrink-0 -mt-5 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition mx-1"
            aria-label="سجّل صدى"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>

          {/* Right tabs */}
          {rightTabs.map((t) => (
            <NavButton
              key={t.key}
              active={tab === t.key}
              icon={t.icon}
              label={t.label}
              onClick={() => onTabClick(t.key)}
              badge={
                t.key === 'notifications' && unread > 0
                  ? Math.min(unread, 99)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
  badge,
}: {
  active: boolean
  icon: any
  label: string
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition shrink-0 min-w-[52px]',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        <Icon className="h-4 w-4" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  )
}
