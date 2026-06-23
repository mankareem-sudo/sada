'use client'

import { useSada } from '@/lib/store'
import {
  Sparkles,
  Home,
  Compass,
  User,
  Plus,
  Bell,
  MessageSquare,
  Shield,
  Flame,
  Bookmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabKey } from '@/lib/types'

export function BottomNav() {
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const unread = useSada((s) => s.unreadNotifications)
  const user = useSada((s) => s.user)

  const onTabClick = (t: TabKey) => {
    if (t === 'profile') setViewedUsername(null)
    setTab(t)
  }

  // Fixed tabs — never change based on state
  const leftTabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'today', label: 'اليوم', icon: Sparkles },
    { key: 'feed', label: 'الرئيسية', icon: Home },
    { key: 'discover', label: 'اكتشف', icon: Compass },
  ]

  const rightTabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'messages', label: 'رسايل', icon: MessageSquare },
    { key: 'notifications', label: 'إشعارات', icon: Bell },
    { key: 'profile', label: 'حسابي', icon: User },
  ]

  // Admin tab is extra — shown as a small floating button or in profile
  // We'll add it after profile if admin

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-2xl mx-auto px-3 pb-3 pointer-events-auto">
        <div className="sada-glass rounded-2xl shadow-2xl flex items-center justify-between p-1.5 relative">
          {/* Left tabs — FIXED, never change */}
          <div className="flex items-center gap-0.5">
            {leftTabs.map((t) => (
              <NavButton
                key={t.key}
                active={tab === t.key}
                icon={t.icon}
                label={t.label}
                onClick={() => onTabClick(t.key)}
              />
            ))}
          </div>

          {/* Center record button — always visible */}
          <button
            onClick={() => setRecorderOpen(true)}
            className="shrink-0 -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 hover:scale-110 active:scale-95 transition border-4 border-background z-10"
            aria-label="سجّل صدى"
          >
            <Plus className="h-6 w-6" strokeWidth={3} />
          </button>

          {/* Right tabs — FIXED, never change */}
          <div className="flex items-center gap-0.5">
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
            {/* Admin button — separate, small */}
            {user?.isAdmin && (
              <NavButton
                active={tab === 'admin'}
                icon={Shield}
                label="إدارة"
                onClick={() => setTab('admin')}
              />
            )}
          </div>
        </div>
        
        {/* Extra tabs (Trending + Bookmarks) as small pills above */}
        <div className="flex justify-center gap-2 mt-1">
          <button
            onClick={() => setTab('trending')}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-medium transition',
              tab === 'trending' ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Flame className="h-3 w-3" /> رائج
          </button>
          <button
            onClick={() => setTab('bookmarks')}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-medium transition',
              tab === 'bookmarks' ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'
            )}
          >
            <Bookmark className="h-3 w-3" /> محفوظات
          </button>
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
        'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition shrink-0 min-w-[48px]',
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
