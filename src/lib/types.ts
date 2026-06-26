// Shared types for Sada
export interface SadaUser {
  id: string
  email: string
  username: string
  name: string
  bio?: string | null
  avatarColor: string
  avatarUrl?: string | null
  coverUrl?: string | null
  isVerified?: boolean
  isAdmin?: boolean
  onboarded?: boolean
  interests?: string | null
  theme?: string
  language?: string
  emailVerified?: boolean
}

export interface SadaLinkPreview {
  url: string
  title?: string | null
  description?: string | null
  image?: string | null
  siteName?: string | null
}

export interface SadaPollOption {
  id: string
  text: string
}

export interface SadaPost {
  id: string
  type: 'text' | 'image' | 'voice' | 'link' | 'poll'
  content?: string | null
  imageUrl?: string | null
  voiceNoteId?: string | null
  privacy?: string
  hashtags?: string | null
  createdAt: string
  // Link preview fields
  linkUrl?: string | null
  linkTitle?: string | null
  linkDescription?: string | null
  linkImage?: string | null
  // Poll fields
  pollQuestion?: string | null
  pollOptions?: SadaPollOption[] | string | null  // array or JSON string
  pollAllowMultiple?: boolean
  pollExpiresAt?: string | null
  // Counts
  reactionsCount?: number
  commentsCount?: number
  myReaction?: string | null
  reactions?: Record<string, number>
  user?: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
    isVerified?: boolean
  }
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
    isVerified?: boolean
  }
  likedByMe?: boolean
  bookmarkedByMe?: boolean
  likesCount?: number
  commentsCount?: number
  replyToId?: string | null
  replies?: SadaVoiceNote[] // voice replies (duets)
}

export interface SadaComment {
  id: string
  content?: string | null
  imageUrl?: string | null
  voiceData?: string | null
  voiceDuration?: number | null
  createdAt: string
  parentId?: string | null
  depth?: number
  replyToName?: string | null
  isPinned?: boolean
  isHidden?: boolean
  editedAt?: string | null
  user: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
    isVerified?: boolean
  } | null
  likedByMe?: boolean
  likesCount?: number
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
    voiceBioUrl?: string | null
    voiceBioDuration?: number
    isVerified?: boolean
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
  | 'circles'

export type ReportReason = 'religion' | 'politics' | 'insult' | 'spam' | 'other'

export interface SadaUserLight {
  id: string
  username: string
  name: string
  avatarColor: string
  bio?: string | null
}
