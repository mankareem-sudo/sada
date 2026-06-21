'use client'

import { useEffect, useState } from 'react'
import { useSada } from '@/lib/store'
import { Avatar } from './Avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, UserPlus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { SadaUserLight } from '@/lib/types'

export function FollowListModal({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const open = useSada((s) => s.followListOpen)
  const close = useSada((s) => s.closeFollowList)
  const mode = useSada((s) => s.followListMode)
  const userId = useSada((s) => s.followListUserId)
  const currentUser = useSada((s) => s.user)

  const [users, setUsers] = useState<SadaUserLight[]>([])
  const [loading, setLoading] = useState(false)
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    fetch(`/api/users/${mode}?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setUsers(d.users || [])
          setFollowingSet(new Set())
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, userId, mode])

  const toggleFollow = async (targetId: string) => {
    if (!currentUser) return
    const isFollowing = followingSet.has(targetId)
    setFollowingSet((prev) => {
      const next = new Set(prev)
      if (isFollowing) next.delete(targetId)
      else next.add(targetId)
      return next
    })
    try {
      await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetId,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      })
    } catch {
      setFollowingSet((prev) => {
        const next = new Set(prev)
        if (isFollowing) next.add(targetId)
        else next.delete(targetId)
        return next
      })
      toast.error('فشل')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'followers' ? 'المتابعون' : 'يتابعهم'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {mode === 'followers' ? 'مفيش متابعين لسه' : 'مش بيتابع حد لسه'}
            </p>
          ) : (
            <div className="space-y-1">
              {users.map((u) => {
                const isMe = u.id === currentUser?.id
                const isFollowing = followingSet.has(u.id)
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition"
                  >
                    <button
                      onClick={() => {
                        close()
                        onOpenProfile(u.username)
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-right"
                    >
                      <Avatar
                        name={u.name}
                        color={u.avatarColor}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate" dir="ltr">
                          @{u.username}
                        </div>
                        {u.bio && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {u.bio}
                          </div>
                        )}
                      </div>
                    </button>
                    {!isMe && currentUser && (
                      <Button
                        size="sm"
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={() => toggleFollow(u.id)}
                        className="shrink-0 gap-1 h-8"
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="h-3 w-3" />
                            متابع
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            متابعة
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
