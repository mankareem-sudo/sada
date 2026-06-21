'use client'

import { Mic } from 'lucide-react'
import { useSada } from '@/lib/store'

export function Header() {
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const setViewedUsername = useSada((s) => s.setViewedUsername)

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => {
            setViewedUsername(null)
            setTab('today')
          }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
            <Mic className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg font-cairo">صَدى</span>
        </button>

        <div className="text-xs text-muted-foreground">
          {tab === 'today' && 'سؤال اليوم'}
          {tab === 'feed' && 'الرئيسية'}
          {tab === 'discover' && 'اكتشف'}
          {tab === 'profile' && 'الملف الشخصي'}
        </div>
      </div>
    </header>
  )
}
