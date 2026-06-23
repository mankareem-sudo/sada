'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PostCard } from './PostCard'
import { PostComposer } from './PostComposer'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { useSada } from '@/lib/store'

interface Post {
  id: string
  type: string
  content?: string | null
  imageUrl?: string | null
  voiceNoteId?: string | null
  plays: number
  createdAt: string
  user: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
  } | null
  likedByMe: boolean
  likesCount: number
  commentsCount: number
}

export function PostsFeed({
  onOpenProfile,
  scope = 'all',
}: {
  onOpenProfile?: (username: string) => void
  scope?: 'all' | 'following'
}) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const setTab = useSada((s) => s.setTab)

  const load = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setCursor(null); setHasMore(true) }
    else setLoadingMore(true)
    try {
      const url = `/api/posts/feed?limit=15&scope=${scope}${!reset && cursor ? `&cursor=${cursor}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      const newPosts = data.posts || []
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts])
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch {} finally { setLoading(false); setLoadingMore(false) }
  }, [cursor, scope])

  useEffect(() => { load(true) }, [scope])

  const refresh = () => load(true)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PostComposer onPosted={refresh} />

      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Sparkles className="h-12 w-12 text-primary/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            مفيش بوستات لسه. كن أول واحد ينشر!
          </p>
          <Button variant="outline" size="sm" onClick={refresh}>تحديث</Button>
        </motion.div>
      ) : (
        <>
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <PostCard post={post} onOpenProfile={onOpenProfile} />
            </motion.div>
          ))}

          {hasMore && (
            <div className="flex justify-center py-4">
              <Button variant="outline" onClick={() => load(false)} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحميل المزيد'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
