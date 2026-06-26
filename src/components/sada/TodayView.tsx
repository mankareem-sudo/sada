'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Pen, Image as ImageIcon } from 'lucide-react'
import { useSada } from '@/lib/store'
import { PostsFeed } from './PostsFeed'
import { WhoToFollow } from './WhoToFollow'
import { StoriesBar } from './StoriesBar'
import { Avatar } from './Avatar'

export function TodayView() {
  const user = useSada((s) => s.user)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const [postContent, setPostContent] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreatePost = async () => {
    if (!postContent.trim()) return
    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content: postContent,
          privacy: 'public',
        }),
      })
      if (res.ok) {
        setPostContent('')
        setRefreshKey(k => k + 1) // Refresh feed
      }
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Stories Bar */}
      <StoriesBar onOpenProfile={() => {}} />

      {/* Post Composer — Facebook-style */}
      <Card className="p-4 sada-glass rounded-2xl">
        <div className="flex gap-3">
          <Avatar
            name={user?.name || '?'}
            color={user?.avatarColor || '#888'}
            imageUrl={user?.avatarUrl}
            size="md"
          />
          <div className="flex-1">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={`إيه اللي في بالك يا ${user?.name?.split(' ')[0] || 'صديق'}؟`}
              rows={2}
              maxLength={2000}
              className="w-full bg-muted/30 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                <button className="p-2 hover:bg-muted/40 rounded-full transition" title="صورة">
                  <ImageIcon className="h-5 w-5 text-emerald-500" />
                </button>
                <button
                  onClick={() => setRecorderOpen(true)}
                  className="p-2 hover:bg-muted/40 rounded-full transition"
                  title="تسجيل صوتي"
                >
                  <Pen className="h-5 w-5 text-primary" />
                </button>
              </div>
              <Button
                onClick={handleCreatePost}
                disabled={!postContent.trim()}
                size="sm"
                className="gap-2"
              >
                نشر
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Feed */}
      <PostsFeed key={refreshKey} onOpenProfile={(u) => {
        useSada.getState().setViewedUsername(u)
        useSada.getState().setTab('profile')
      }} />

      {/* Who to follow */}
      <WhoToFollow />
    </div>
  )
}
