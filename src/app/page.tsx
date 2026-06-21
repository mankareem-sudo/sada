'use client'

import { useEffect } from 'react'
import { useSada } from '@/lib/store'
import { AuthScreen } from '@/components/sada/AuthScreen'
import { Header } from '@/components/sada/Header'
import { BottomNav } from '@/components/sada/BottomNav'
import { TodayView } from '@/components/sada/TodayView'
import { FeedView } from '@/components/sada/FeedView'
import { DiscoverView } from '@/components/sada/DiscoverView'
import { ProfileView } from '@/components/sada/ProfileView'
import { VoiceRecorder } from '@/components/sada/VoiceRecorder'

export default function Home() {
  const user = useSada((s) => s.user)
  const authLoading = useSada((s) => s.authLoading)
  const setUser = useSada((s) => s.setUser)
  const setAuthLoading = useSada((s) => s.setAuthLoading)
  const tab = useSada((s) => s.tab)
  const setTab = useSada((s) => s.setTab)
  const todayPrompt = useSada((s) => s.todayPrompt)
  const setTodayPrompt = useSada((s) => s.setTodayPrompt)
  const recorderOpen = useSada((s) => s.recorderOpen)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const viewedUsername = useSada((s) => s.viewedUsername)

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user)
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))

    // Load today's prompt
    fetch('/api/prompts/today')
      .then((r) => r.json())
      .then((d) => {
        if (d.prompt) setTodayPrompt(d.prompt)
      })
      .catch(() => {})
  }, [setUser, setAuthLoading, setTodayPrompt])

  // Show nothing while checking auth (avoids flicker)
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

  // Not logged in → show auth screen
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
        {tab === 'profile' && <ProfileView username={viewedUsername} />}
      </main>
      <BottomNav />

      <VoiceRecorder
        key={recorderOpen ? 'open' : 'closed'}
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        onSubmitted={() => {
          // Reload relevant data
          if (tab === 'today' || tab === 'profile') {
            // trigger re-render via state changes inside views
            // simplest: switch to discover or reload
            setTab(tab === 'profile' ? 'profile' : 'today')
          }
        }}
        promptId={todayPrompt?.id}
        promptDate={todayPrompt?.date}
        promptText={todayPrompt?.text}
      />
    </div>
  )
}
