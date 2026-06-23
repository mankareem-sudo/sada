'use client'

import { Mic, Bell, Search } from 'lucide-react'
import { useSada } from '@/lib/store'
import { Avatar } from './Avatar'

export function Header() {
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setSearchOpen = useSada((s) => s.setSearchOpen)
  const setSettingsOpen = useSada((s) => s.setSettingsOpen)
  const user = useSada((s) => s.user)
  const unread = useSada((s) => s.unreadNotifications)

  const tabLabels: Record<string, string> = {
    today: 'سؤال اليوم',
    feed: 'الرئيسية',
    discover: 'اكتشف',
    trending: 'رائج',
    notifications: 'الإشعارات',
    profile: 'الملف الشخصي',
    bookmarks: 'المحفوظات',
    admin: 'لوحة الإدارة',
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
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

        <div className="text-xs text-muted-foreground hidden sm:block">
          {tabLabels[tab] || ''}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 hover:bg-muted/60 rounded-full transition"
            aria-label="بحث"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={() => setTab('notifications')}
            className="p-2 hover:bg-muted/60 rounded-full transition relative"
            aria-label="إشعارات"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
            )}
          </button>

          {user && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 rounded-full hover:bg-muted/60 transition"
              aria-label="إعدادات"
            >
              <Avatar
                name={user.name}
                color={user.avatarColor}
                imageUrl={user.avatarUrl}
                size="sm"
              />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
