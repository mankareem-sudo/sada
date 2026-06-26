'use client'

import { useEffect, useState, useRef } from 'react'
import { Avatar } from './Avatar'
import { Button } from '@/components/ui/button'
import { VoicePlayer } from './VoicePlayer'
import { Loader2, X, Plus, ChevronLeft, Eye } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StoryGroup {
  author: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
    isVerified?: boolean
  }
  stories: StoryItem[]
  hasUnviewed: boolean
}

interface StoryItem {
  id: string
  durationSec: number
  backgroundColor: string
  transcript?: string | null
  viewsCount: number
  createdAt: string
  expiresAt: string
  isViewed: boolean
  isMine: boolean
}

interface FullStory extends StoryItem {
  audioData: string
  userId: string
}

export function StoriesBar({ onOpenProfile }: { onOpenProfile: (username: string) => void }) {
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null)
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0)
  const [currentStory, setCurrentStory] = useState<FullStory | null>(null)
  const [loadingStory, setLoadingStory] = useState(false)
  const user = useSada((s) => s.user)
  const recorderOpen = useSada((s) => s.recorderOpen)
  const openRecorder = useSada((s) => s.openRecorder)

  const loadFeed = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stories/feed')
      const data = await res.json()
      setGroups(data.grouped || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [])

  // Fetch full story data (with audioData) when viewing
  const openStory = async (group: StoryGroup, storyIndex: number = 0) => {
    setViewerGroup(group)
    setViewerStoryIndex(storyIndex)
    setViewerOpen(true)

    const story = group.stories[storyIndex]
    if (!story) return

    setLoadingStory(true)
    try {
      // Fetch the full story (with audioData)
      const res = await fetch(`/api/stories/feed`)
      const data = await res.json()
      const full = (data.stories || []).find((s: any) => s.id === story.id)
      if (full) {
        setCurrentStory(full)
        // Mark as viewed
        if (!story.isViewed) {
          fetch('/api/stories/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyId: story.id }),
          }).then(() => loadFeed()).catch(() => {})
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingStory(false)
    }
  }

  const goNext = () => {
    if (!viewerGroup) return
    const next = viewerStoryIndex + 1
    if (next < viewerGroup.stories.length) {
      openStory(viewerGroup, next)
    } else {
      // Move to next group
      const currentGroupIdx = groups.findIndex(g => g.author.id === viewerGroup.author.id)
      if (currentGroupIdx < groups.length - 1) {
        openStory(groups[currentGroupIdx + 1], 0)
      } else {
        setViewerOpen(false)
      }
    }
  }

  const goPrev = () => {
    if (viewerStoryIndex > 0 && viewerGroup) {
      openStory(viewerGroup, viewerStoryIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shrink-0 flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-muted/40 animate-pulse" />
            <div className="w-12 h-2 rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  // Include "your story" placeholder at start
  const myGroup: StoryGroup | null = user ? {
    author: {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
      isVerified: false,
    },
    stories: [],
    hasUnviewed: false,
  } : null

  const allGroups = myGroup ? [myGroup, ...groups.filter(g => g.author.id !== user?.id)] : groups

  if (allGroups.length === 0) return null

  return (
    <>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {allGroups.map((group) => {
          const isMe = group.author.id === user?.id
          const hasStories = group.stories.length > 0
          return (
            <button
              key={group.author.id}
              onClick={() => {
                if (isMe && !hasStories) {
                  openRecorder('story')
                } else if (hasStories) {
                  openStory(group, 0)
                } else {
                  onOpenProfile(group.author.username)
                }
              }}
              className="shrink-0 flex flex-col items-center gap-1 group"
            >
              <div
                className={cn(
                  'relative w-16 h-16 rounded-full p-0.5 transition',
                  group.hasUnviewed
                    ? 'bg-gradient-to-tr from-primary via-accent to-primary'
                    : 'bg-muted/40'
                )}
              >
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  <Avatar
                    name={group.author.name}
                    color={group.author.avatarColor}
                    imageUrl={group.author.avatarUrl}
                    size="md"
                    isVerified={group.author.isVerified}
                    className="!w-full !h-full"
                  />
                </div>
                {isMe && (
                  <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <Plus className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">
                {isMe ? 'ستوريك' : group.author.name.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Story Viewer Modal */}
      {viewerOpen && viewerGroup && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Author info */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <Avatar
              name={viewerGroup.author.name}
              color={viewerGroup.author.avatarColor}
              imageUrl={viewerGroup.author.avatarUrl}
              size="sm"
              isVerified={viewerGroup.author.isVerified}
            />
            <div className="text-right">
              <div className="text-white text-sm font-medium flex items-center gap-1">
                {viewerGroup.author.name}
                <button
                  onClick={() => {
                    onOpenProfile(viewerGroup.author.username)
                    setViewerOpen(false)
                  }}
                  className="text-white/60 hover:text-white text-xs"
                >
                  @{viewerGroup.author.username}
                </button>
              </div>
              <div className="text-white/60 text-[11px]">
                {currentStory ? timeAgo(currentStory.createdAt) : ''}
                {currentStory?.isMine && currentStory?.viewsCount > 0 && (
                  <span className="flex items-center gap-1 mt-0.5">
                    <Eye className="w-3 h-3" />
                    {currentStory.viewsCount} مشاهدة
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bars (one per story in group) */}
          <div className="absolute top-16 left-4 right-4 flex gap-1 z-10">
            {viewerGroup.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full bg-white transition-all',
                    i < viewerStoryIndex ? 'w-full' : i === viewerStoryIndex ? 'w-full' : 'w-0'
                  )}
                />
              </div>
            ))}
          </div>

          {/* Nav arrows */}
          {viewerStoryIndex > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              <ChevronLeft className="w-6 h-6 text-white rotate-180" />
            </button>
          )}
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          {/* Story content */}
          <div
            className="w-full max-w-md rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px]"
            style={{
              background: `linear-gradient(135deg, ${currentStory?.backgroundColor || '#1763CC'}, ${currentStory?.backgroundColor || '#1763CC'}aa)`,
            }}
          >
            {loadingStory ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : currentStory ? (
              <>
                {currentStory.transcript && (
                  <p className="text-white/90 text-center text-sm mb-6 line-clamp-3">
                    "{currentStory.transcript}"
                  </p>
                )}
                <VoicePlayer
                  src={currentStory.audioData}
                  durationSec={currentStory.durationSec}
                  accent="accent"
                  title="ستوري صوتي"
                  artist={viewerGroup.author.name}
                  album="صدى ستوريز"
                  artworkUrl={viewerGroup.author.avatarUrl || undefined}
                />
                <p className="text-white/60 text-xs mt-6 text-center">
                  الستوري تختفي بعد 24 ساعة
                </p>
              </>
            ) : (
              <p className="text-white/70 text-sm">مفيش محتوى</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
