'use client'

import { useEffect, useRef, useState } from 'react'
import { useSada } from '@/lib/store'
import { AuthScreen } from '@/components/sada/AuthScreen'
import { Header } from '@/components/sada/Header'
import { BottomNav } from '@/components/sada/BottomNav'
import { TodayView } from '@/components/sada/TodayView'
import { FeedView } from '@/components/sada/FeedView'
import { DiscoverView } from '@/components/sada/DiscoverView'
import { TrendingView } from '@/components/sada/TrendingView'
import { BookmarksView } from '@/components/sada/BookmarksView'
import { NotificationsView } from '@/components/sada/NotificationsView'
import { ProfileView } from '@/components/sada/ProfileView'
import { MessagesView } from '@/components/sada/MessagesView'
import { AdminPanel } from '@/components/sada/AdminPanel'
import { VoiceRecorder } from '@/components/sada/VoiceRecorder'
import { SearchModal } from '@/components/sada/SearchModal'
import { SupportModal } from '@/components/sada/SupportModal'
import { SettingsModal } from '@/components/sada/SettingsModal'
import { OnboardingModal } from '@/components/sada/OnboardingModal'
import { EmailVerificationGate } from '@/components/sada/EmailVerificationGate'
import { CookieConsent } from '@/components/sada/CookieConsent'
import { FollowListModal } from '@/components/sada/FollowListModal'
import { SharedNoteModal } from '@/components/sada/SharedNoteModal'

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
  const setSharedNoteId = useSada((s) => s.setSharedNoteId)

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
          // Apply user's theme + language preferences
          if (d.user.theme) {
            useSada.getState().setTheme(d.user.theme)
            if (typeof window !== 'undefined') {
              localStorage.setItem('sada-theme', d.user.theme)
              document.documentElement.classList.remove('dark', 'light')
              document.documentElement.classList.add(d.user.theme)
            }
          }
          if (d.user.language) {
            useSada.getState().setLanguage(d.user.language)
            if (typeof window !== 'undefined') {
              localStorage.setItem('sada-language', d.user.language)
              document.documentElement.lang = d.user.language
              document.documentElement.dir = d.user.language === 'ar' ? 'rtl' : 'ltr'
            }
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

  // Check for share link on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const shareId = url.searchParams.get('share')
    if (shareId) {
      setSharedNoteId(shareId)
      // Clean URL
      url.searchParams.delete('share')
      window.history.replaceState({}, '', url.toString())
    }
  }, [setSharedNoteId])

  // Trigger onboarding when a new user logs in but hasn't onboarded
  const lastUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (user && !user.onboarded && lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id
      Promise.resolve().then(() => setOnboardingOpen(true))
    } else if (!user) {
      lastUserIdRef.current = null
    }
  }, [user])

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

  // BLOCK: If email not verified → show verification gate (no access to app)
  if (!user.emailVerified) {
    return <EmailVerificationGate />
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
        {tab === 'trending' && (
          <TrendingView onOpenProfile={onOpenProfile} />
        )}
        {tab === 'bookmarks' && (
          <BookmarksView onOpenProfile={onOpenProfile} />
        )}
        {tab === 'notifications' && (
          <NotificationsView onOpenProfile={onOpenProfile} />
        )}
        {tab === 'messages' && <MessagesView />}
        {tab === 'profile' && <ProfileView username={viewedUsername} />}
        {tab === 'admin' && user.isAdmin && <AdminPanel />}
      </main>
      <BottomNav />
      <CookieConsent />

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

      <FollowListModal onOpenProfile={onOpenProfile} />

      <SharedNoteModal onOpenProfile={onOpenProfile} />
    </div>
  )
}
