'use client'

import { useEffect, useRef, useState } from 'react'
import { useSada } from '@/lib/store'
import { AuthScreen } from '@/components/sada/AuthScreen'
import { Header } from '@/components/sada/Header'
import { BottomNav } from '@/components/sada/BottomNav'
import { TodayView } from '@/components/sada/TodayView'
import { FeedView } from '@/components/sada/FeedView'
import { DiscoverView } from '@/components/sada/DiscoverView'
import { NotificationsView } from '@/components/sada/NotificationsView'
import { ProfileView } from '@/components/sada/ProfileView'
import { VoiceRecorder } from '@/components/sada/VoiceRecorder'
import { SearchModal } from '@/components/sada/SearchModal'
import { SupportModal } from '@/components/sada/SupportModal'
import { SettingsModal } from '@/components/sada/SettingsModal'
import { OnboardingModal } from '@/components/sada/OnboardingModal'

export default function Home() {
  const user = useSada((s) => s.user)
  const authLoading = useSada((s) => s.authLoading)
  const setUser = useSada((s) => s.setUser)
  const setAuthLoading = useSada((s) => s.setAuthLoading)
  const setUnreadNotifications = useSada((s) => s.setUnreadNotifications)
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const todayPrompt = useSada((s) => s.todayPrompt)
  const setTodayPrompt = useSada((s) => s.setTodayPrompt)
  const recorderOpen = useSada((s) => s.recorderOpen)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const viewedUsername = useSada((s) => s.viewedUsername)
  const searchOpen = useSada((s) => s.searchOpen)
  const setSearchOpen = useSada((s) => s.setSearchOpen)
  const supportOpen = useSada((s) => s.supportOpen)
  const setSupportOpen = useSada((s) => s.setSupportOpen)
  const settingsOpen = useSada((s) => s.settingsOpen)
  const setSettingsOpen = useSada((s) => s.setSettingsOpen)

  const [onboardingOpen, setOnboardingOpen] = useState(false)

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user)
          if (typeof d.stats?.unreadNotifications === 'number') {
            setUnreadNotifications(d.stats.unreadNotifications)
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))

    fetch('/api/prompts/today')
      .then((r) => r.json())
      .then((d) => {
        if (d.prompt) setTodayPrompt(d.prompt)
      })
      .catch(() => {})
  }, [setUser, setAuthLoading, setTodayPrompt, setUnreadNotifications])

  // Trigger onboarding when a new user logs in but hasn't onboarded
  // Derived from user state — no need for separate state, but for modal open/close we need it.
  // Use a guard so we only flip to true once per session.
  const lastUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (user && !user.onboarded && lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id
      // Defer via microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => setOnboardingOpen(true))
    } else if (!user) {
      lastUserIdRef.current = null
    }
  }, [user])

  // Show nothing while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  const onOpenProfile = (username: string) => {
    useSada.getState().setViewedUsername(username)
    setTab('profile')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {tab === 'today' && <TodayView />}
        {tab === 'feed' && <FeedView onOpenProfile={onOpenProfile} />}
        {tab === 'discover' && <DiscoverView onOpenProfile={onOpenProfile} />}
        {tab === 'notifications' && (
          <NotificationsView onOpenProfile={onOpenProfile} />
        )}
        {tab === 'profile' && <ProfileView username={viewedUsername} />}
      </main>
      <BottomNav />

      {/* Modals */}
      <VoiceRecorder
        key={recorderOpen ? 'open' : 'closed'}
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        onSubmitted={() => {
          if (tab === 'today' || tab === 'profile') {
            setTab(tab === 'profile' ? 'profile' : 'today')
          }
        }}
        promptId={todayPrompt?.id}
        promptDate={todayPrompt?.date}
        promptText={todayPrompt?.text}
      />

      <SearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onOpenProfile={onOpenProfile}
      />

      <SupportModal open={supportOpen} onOpenChange={setSupportOpen} />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <OnboardingModal open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </div>
  )
}
