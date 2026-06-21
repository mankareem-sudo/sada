'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { useSada } from '@/lib/store'
import { formatCount, formatArabicDate, timeAgo } from '@/lib/format'
import type { SadaProfile } from '@/lib/types'
import { toast } from 'sonner'
import { LogOut, UserPlus, UserCheck, Pencil, Trash2, Mic, Play } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export function ProfileView({ username }: { username: string | null }) {
  const user = useSada((s) => s.user)
  const setUser = useSada((s) => s.setUser)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)

  const [profile, setProfile] = useState<SadaProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [followBusy, setFollowBusy] = useState(false)

  const target = username || user?.username || null

  const load = useCallback(async () => {
    if (!target) return
    setLoading(true)
    try {
      const url = username
        ? `/api/users/profile?username=${encodeURIComponent(username)}`
        : `/api/users/profile?userId=${user?.id}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) setProfile(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [target, username, user?.id])

  useEffect(() => {
    load()
  }, [load])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    toast.success('خرجت من حسابك')
  }

  const toggleFollow = async () => {
    if (!profile || !user) return
    setFollowBusy(true)
    const newFollowing = !profile.isFollowing
    // optimistic update
    setProfile({
      ...profile,
      isFollowing: newFollowing,
      stats: {
        ...profile.stats,
        followers: profile.stats.followers + (newFollowing ? 1 : -1),
      },
    })
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: profile.user.id,
          action: newFollowing ? 'follow' : 'unfollow',
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // revert
      setProfile({
        ...profile,
        isFollowing: !newFollowing,
        stats: {
          ...profile.stats,
          followers: profile.stats.followers + (newFollowing ? -1 : 1),
        },
      })
      toast.error('فشل، حاول مرة تانية')
    } finally {
      setFollowBusy(false)
    }
  }

  const deleteNote = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/users/me?id=${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف التسجيل')
        setProfile((p) =>
          p
            ? {
                ...p,
                voiceNotes: p.voiceNotes.filter((n) => n.id !== deleteId),
                stats: { ...p.stats, voiceNotes: p.stats.voiceNotes - 1 },
              }
            : null
        )
      }
    } catch {
      toast.error('فشل الحذف')
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-4">
        <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 pb-28 text-center">
        <p className="text-muted-foreground">المستخدم غير موجود</p>
        <Button className="mt-4" onClick={() => setViewedUsername(null)}>
          العودة لملفي
        </Button>
      </div>
    )
  }

  const isMe = profile.isMe

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Profile header */}
      <Card className="p-6 rounded-3xl sada-glass">
        <div className="flex items-start gap-4">
          <Avatar
            name={profile.user.name}
            color={profile.user.avatarColor}
            size="xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold font-cairo">{profile.user.name}</h2>
              {isMe && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3 w-3 ml-1" />
                  تعديل
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground mb-1" dir="ltr">
              @{profile.user.username}
            </div>
            {profile.user.bio && (
              <p className="text-sm mt-2 leading-relaxed">{profile.user.bio}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              انضم في {formatArabicDate(profile.user.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="font-bold text-lg tabular-nums">
              {formatCount(profile.stats.voiceNotes)}
            </div>
            <div className="text-[11px] text-muted-foreground">صدى</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="font-bold text-lg tabular-nums">
              {formatCount(profile.stats.followers)}
            </div>
            <div className="text-[11px] text-muted-foreground">متابع</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="font-bold text-lg tabular-nums">
              {formatCount(profile.stats.following)}
            </div>
            <div className="text-[11px] text-muted-foreground">يتابع</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          {isMe ? (
            <>
              <Button
                onClick={() => setRecorderOpen(true)}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              >
                <Mic className="h-4 w-4" />
                سجّل صدى جديد
              </Button>
              <Button variant="outline" size="icon" onClick={logout} aria-label="خروج">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              onClick={toggleFollow}
              disabled={followBusy}
              variant={profile.isFollowing ? 'outline' : 'default'}
              className="flex-1 gap-2"
            >
              {profile.isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  متابع
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  متابعة
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Voice notes */}
      <div>
        <h3 className="font-semibold text-sm mb-3 px-1">
          {isMe ? 'صدى صوتك' : 'الأصداء'}
          <span className="text-muted-foreground font-normal mr-1">
            ({profile.voiceNotes.length})
          </span>
        </h3>

        {profile.voiceNotes.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-dashed">
            <Mic className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isMe
                ? 'لسه ما سجلتش صدى. ابدأ أول تسجيل!'
                : 'هذا المستخدم لسه ما سجلش صدى'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {profile.voiceNotes.map((n) => (
              <Card key={n.id} className="p-4 sada-glass rounded-2xl sada-fade-up">
                {n.prompt && (
                  <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/15">
                    <div className="text-[11px] text-primary/80 mb-1">
                      رد على سؤال {formatArabicDate(n.prompt.date)}
                    </div>
                    <div className="text-sm font-medium">{n.prompt.text}</div>
                  </div>
                )}
                <VoicePlayer
                  src={n.audioData}
                  durationSec={n.durationSec}
                />
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>{timeAgo(n.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    {formatCount(n.plays)} تشغيل
                  </span>
                </div>
                {isMe && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setDeleteId(n.id)}
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      حذف
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit profile dialog */}
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onUpdated={(updated) => {
          setProfile({ ...profile, user: { ...profile.user, ...updated.user } })
          if (user) setUser({ ...user, ...updated.user })
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التسجيل؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف التسجيل نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  profile: SadaProfile
  onUpdated: (u: { user: any }) => void
}) {
  const [name, setName] = useState(profile.user.name)
  const [bio, setBio] = useState(profile.user.bio || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(profile.user.name)
    setBio(profile.user.bio || '')
  }, [profile, open])

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الحفظ')
        return
      }
      toast.success('تم تحديث الملف')
      onUpdated(data)
      onOpenChange(false)
    } catch {
      toast.error('فشل الحفظ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل الملف الشخصي</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">الاسم</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">نبذة</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="اكتب نبذة قصيرة عنك..."
            />
            <div className="text-[11px] text-muted-foreground text-left">
              {bio.length}/200
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? 'جاري...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
