'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { useSada } from '@/lib/store'
import { Search, X, Loader2, User as UserIcon, Mic } from 'lucide-react'
import { timeAgo } from '@/lib/format'
import type { SadaVoiceNote, SadaUser } from '@/lib/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface SearchResult {
  users: (SadaUser & { bio?: string | null })[]
  voiceNotes: SadaVoiceNote[]
}

export function SearchModal({
  open,
  onOpenChange,
  onOpenProfile,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onOpenProfile: (username: string) => void
}) {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<SearchResult>({ users: [], voiceNotes: [] })
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setResult({ users: [], voiceNotes: [] })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResult({
        users: data.users || [],
        voiceNotes: data.voiceNotes || [],
      })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResult({ users: [], voiceNotes: [] })
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(q)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q, search])

  const hasResults = result.users.length > 0 || result.voiceNotes.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden h-[80vh] max-h-[600px]">
        {/* Search input */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث عن أشخاص أو أصداء..."
              className="border-0 bg-transparent focus-visible:ring-0 text-base"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {q && (
              <button
                onClick={() => setQ('')}
                className="p-1 hover:bg-muted/60 rounded-full transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {!q.trim() ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">اكتب اسم أو كلمة للبحث في صدى</p>
            </div>
          ) : !hasResults && !loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                مفيش نتائج لـ &ldquo;{q}&rdquo;
              </p>
            </div>
          ) : (
            <>
              {result.users.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    أشخاص ({result.users.length})
                  </h3>
                  <div className="space-y-1">
                    {result.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onOpenProfile(u.username)
                          onOpenChange(false)
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition text-right"
                      >
                        <Avatar
                          name={u.name}
                          color={u.avatarColor}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{u.name}</div>
                          <div className="text-xs text-muted-foreground" dir="ltr">
                            @{u.username}
                          </div>
                          {u.bio && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {u.bio}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {result.voiceNotes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    أصداء ({result.voiceNotes.length})
                  </h3>
                  <div className="space-y-2">
                    {result.voiceNotes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl border border-border bg-card/50"
                      >
                        {n.user && (
                          <button
                            onClick={() => {
                              onOpenProfile(n.user!.username)
                              onOpenChange(false)
                            }}
                            className="flex items-center gap-2 mb-2"
                          >
                            <Avatar
                              name={n.user.name}
                              color={n.user.avatarColor}
                              size="sm"
                            />
                            <div className="text-xs">
                              <div className="font-medium">{n.user.name}</div>
                              <div className="text-muted-foreground" dir="ltr">
                                @{n.user.username} · {timeAgo(n.createdAt)}
                              </div>
                            </div>
                          </button>
                        )}
                        {n.description && (
                          <p className="text-sm mb-2">{n.description}</p>
                        )}
                        <VoicePlayer
                          src={n.audioData}
                          durationSec={n.durationSec}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
