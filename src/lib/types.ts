// Shared types for Sada
export interface SadaUser {
  id: string
  email: string
  username: string
  name: string
  bio?: string | null
  avatarColor: string
  isAdmin?: boolean
}

export interface SadaPrompt {
  id: string
  text: string
  date: string
}

export interface SadaVoiceNote {
  id: string
  durationSec: number
  mimeType: string
  audioData: string
  transcript?: string | null
  plays: number
  createdAt: string
  prompt: SadaPrompt | null
  user?: {
    id: string
    username: string
    name: string
    avatarColor: string
  }
  likedByMe?: boolean
  likesCount?: number
}

export interface SadaProfile {
  user: {
    id: string
    username: string
    name: string
    bio?: string | null
    avatarColor: string
    createdAt: string
  }
  stats: {
    followers: number
    following: number
    voiceNotes: number
  }
  isFollowing: boolean
  isMe: boolean
  voiceNotes: SadaVoiceNote[]
}

export type TabKey = 'today' | 'feed' | 'discover' | 'profile'

export type ReportReason = 'religion' | 'politics' | 'insult' | 'spam' | 'other'
