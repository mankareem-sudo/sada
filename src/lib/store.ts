'use client'

import { create } from 'zustand'
import type { SadaUser, SadaPrompt, TabKey } from '@/lib/types'
import type { Language } from '@/lib/i18n'

interface SadaState {
  // Auth
  user: SadaUser | null
  authLoading: boolean
  unreadNotifications: number
  setUser: (u: SadaUser | null) => void
  setAuthLoading: (v: boolean) => void
  setUnreadNotifications: (n: number) => void

  // Active tab
  tab: TabKey
  setTab: (t: TabKey) => void

  // Today's prompt (cached)
  todayPrompt: SadaPrompt | null
  setTodayPrompt: (p: SadaPrompt | null) => void

  // Recorder modal
  recorderOpen: boolean
  setRecorderOpen: (v: boolean) => void

  // Profile viewing: username or null = my profile
  viewedUsername: string | null
  setViewedUsername: (u: string | null) => void

  // Stats (landing)
  stats: { users: number; voiceNotes: number; prompts: number } | null
  setStats: (s: { users: number; voiceNotes: number; prompts: number } | null) => void

  // Search modal
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void

  // Support modal
  supportOpen: boolean
  setSupportOpen: (v: boolean) => void

  // Settings modal
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // Followers/following modal
  followListOpen: boolean
  followListMode: 'followers' | 'following'
  followListUserId: string | null
  openFollowList: (userId: string, mode: 'followers' | 'following') => void
  closeFollowList: () => void

  // Shared voice note modal (via ?share=ID)
  sharedNoteId: string | null
  setSharedNoteId: (id: string | null) => void

  // === NEW: Theme & Language ===
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
  language: Language
  setLanguage: (l: Language) => void
}

export const useSada = create<SadaState>((set) => ({
  user: null,
  authLoading: true,
  unreadNotifications: 0,
  setUser: (u) => set({ user: u }),
  setAuthLoading: (v) => set({ authLoading: v }),
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),

  tab: 'today',
  setTab: (t) => set({ tab: t }),

  todayPrompt: null,
  setTodayPrompt: (p) => set({ todayPrompt: p }),

  recorderOpen: false,
  setRecorderOpen: (v) => set({ recorderOpen: v }),

  viewedUsername: null,
  setViewedUsername: (u) => set({ viewedUsername: u }),

  stats: null,
  setStats: (s) => set({ stats: s }),

  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),

  supportOpen: false,
  setSupportOpen: (v) => set({ supportOpen: v }),

  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  followListOpen: false,
  followListMode: 'followers',
  followListUserId: null,
  openFollowList: (userId, mode) =>
    set({ followListOpen: true, followListUserId: userId, followListMode: mode }),
  closeFollowList: () => set({ followListOpen: false }),

  sharedNoteId: null,
  setSharedNoteId: (id) => set({ sharedNoteId: id }),

  // === NEW ===
  theme: 'dark',
  setTheme: (t) => set({ theme: t }),
  language: 'ar',
  setLanguage: (l) => set({ language: l }),
}))
