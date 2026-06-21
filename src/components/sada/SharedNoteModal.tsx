'use client'

import { useEffect, useState } from 'react'
import { useSada } from '@/lib/store'
import { VoiceNoteCard } from './VoiceNoteCard'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2, Mic } from 'lucide-react'
import type { SadaVoiceNote } from '@/lib/types'

export function SharedNoteModal({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void
}) {
  const sharedNoteId = useSada((s) => s.sharedNoteId)
  const setSharedNoteId = useSada((s) => s.setSharedNoteId)
  const [note, setNote] = useState<SadaVoiceNote | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sharedNoteId) return
    let cancelled = false
    fetch(`/api/voice-notes/discover?limit=200`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          const found = (d.notes || []).find(
            (n: SadaVoiceNote) => n.id === sharedNoteId
          )
          setNote(found || null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sharedNoteId])

  return (
    <Dialog
      open={!!sharedNoteId}
      onOpenChange={(v) => !v && setSharedNoteId(null)}
    >
      <DialogContent className="max-w-md">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : note ? (
          <VoiceNoteCard
            note={note}
            showAuthor
            onOpenProfile={(u) => {
              setSharedNoteId(null)
              onOpenProfile(u)
            }}
          />
        ) : (
          <div className="text-center py-10">
            <Mic className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              هذا الصدى غير موجود أو تم حذفه
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
