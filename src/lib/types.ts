// Shared types for Sada
export interface SadaUser {
  id: string
  email: string
  username: string
  name: string
  bio?: string | null
  avatarColor: string
  avatarUrl?: string | null
  isAdmin?: boolean
  onboarded?: boolean
  interests?: string | null
  theme?: string
  language?: string
  emailVerified?: boolean
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
    avatarUrl?: string | null
  }
  likedByMe?: boolean
  bookmarkedByMe?: boolean
  likesCount?: number
  commentsCount?: number
}

export interface SadaComment {
  id: string
  content: string
  createdAt: string
  parentId?: string | null
  user: {
    id: string
    username: string
    name: string
    avatarColor: string
  }
  replies?: SadaComment[]
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
    avatarUrl?: string | null
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

export type TabKey =
  | 'today'
  | 'feed'
  | 'discover'
  | 'trending'
  | 'notifications'
  | 'profile'
  | 'bookmarks'
  | 'admin'
  | 'messages'

export type ReportReason = 'religion' | 'politics' | 'insult' | 'spam' | 'other'

export interface SadaUserLight {
  id: string
  username: string
  name: string
  avatarColor: string
  bio?: string | null
}
