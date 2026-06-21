'use client'

import { useSada } from '@/lib/store'
import { Sparkles, Home, Compass, User, Plus, Bell, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabKey } from '@/lib/types'

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'today', label: 'اليوم', icon: Sparkles },
  { key: 'feed', label: 'الرئيسية', icon: Home },
  { key: 'discover', label: 'اكتشف', icon: Compass },
  { key: 'notifications', label: 'إشعارات', icon: Bell },
  { key: 'profile', label: 'حسابي', icon: User },
]

export function BottomNav() {
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setSearchOpen = useSada((s) => s.setSearchOpen)
  const unread = useSada((s) => s.unreadNotifications)

  const onTabClick = (t: TabKey) => {
    if (t === 'profile') setViewedUsername(null)
    setTab(t)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-2xl mx-auto px-3 pb-3 pointer-events-auto">
        <div className="sada-glass rounded-2xl shadow-2xl flex items-center justify-around p-1.5 relative">
          {TABS.slice(0, 2).map((t) => (
            <NavButton
              key={t.key}
              active={tab === t.key}
              icon={t.icon}
              label={t.label}
              onClick={() => onTabClick(t.key)}
            />
          ))}

          {/* Center: Search + Record + Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="shrink-0 w-10 h-10 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
            aria-label="بحث"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={() => setRecorderOpen(true)}
            className="shrink-0 -mt-6 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition"
            aria-label="سجّل صدى"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>

          {TABS.slice(2, 3).map((t) => (
            <NavButton
              key={t.key}
              active={tab === t.key}
              icon={t.icon}
              label={t.label}
              onClick={() => onTabClick(t.key)}
              badge={unread > 0 ? Math.min(unread, 99) : undefined}
            />
          ))}

          {TABS.slice(3).map((t) => (
            <NavButton
              key={t.key}
              active={tab === t.key}
              icon={t.icon}
              label={t.label}
              onClick={() => onTabClick(t.key)}
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
        'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition flex-1 relative',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
