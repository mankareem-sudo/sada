'use client'

import { create } from 'zustand'
import type { SadaUser, SadaPrompt, TabKey } from '@/lib/types'

interface SadaState {
  // Auth
  user: SadaUser | null
  authLoading: boolean
  setUser: (u: SadaUser | null) => void
  setAuthLoading: (v: boolean) => void

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
}

export const useSada = create<SadaState>((set) => ({
  user: null,
  authLoading: true,
  setUser: (u) => set({ user: u }),
  setAuthLoading: (v) => set({ authLoading: v }),

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
}))
