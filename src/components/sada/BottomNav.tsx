'use client'

import { useSada } from '@/lib/store'
import { Sparkles, Home, Compass, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabKey } from '@/lib/types'

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'today', label: 'اليوم', icon: Sparkles },
  { key: 'feed', label: 'الرئيسية', icon: Home },
  { key: 'discover', label: 'اكتشف', icon: Compass },
  { key: 'profile', label: 'حسابي', icon: User },
]

export function BottomNav() {
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const setViewedUsername = useSada((s) => s.setViewedUsername)

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

          {/* Center record button */}
          <button
            onClick={() => setRecorderOpen(true)}
            className="shrink-0 -mt-6 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition"
            aria-label="سجّل صدى"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>

          {TABS.slice(2).map((t) => (
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
}: {
  active: boolean
  icon: any
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition flex-1',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
