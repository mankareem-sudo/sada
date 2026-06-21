// Shared types for Sada
export interface SadaUser {
  id: string
  email: string
  username: string
  name: string
  bio?: string | null
  avatarColor: string
  isAdmin?: boolean
  onboarded?: boolean
  interests?: string | null
}

export interface SadaPrompt {
  id: string
  text: string
  date: string
  topic?: string | null
}

export interface SadaVoiceNote {
  id: string
  durationSec: number
  mimeType: string
  audioData: string
  description?: string | null
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
  commentsCount?: number
}

export interface SadaComment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    username: string
    name: string
    avatarColor: string
  }
}

export interface SadaNotification {
  id: string
  type: 'like' | 'follow' | 'comment' | 'voice_note' | 'system'
  text: string
  read: boolean
  createdAt: string
  voiceNoteId: string | null
  actor: {
    id: string
    username: string
    name: string
    avatarColor: string
  }
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

export type TabKey = 'today' | 'feed' | 'discover' | 'profile' | 'notifications'

export type ReportReason = 'religion' | 'politics' | 'insult' | 'spam' | 'other'
