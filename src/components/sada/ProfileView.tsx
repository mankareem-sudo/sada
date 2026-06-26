'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { PostCard } from './PostCard'
import { useSada } from '@/lib/store'
import { formatCount, formatArabicDate, timeAgo } from '@/lib/format'
import type { SadaProfile } from '@/lib/types'
import { toast } from 'sonner'
import { UserPlus, UserCheck, Pencil, Trash2, Mic, Play, Users, UserPlus2, UserMinus, Globe, Lock, Eye, Pin, Camera, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Post {
  id: string
  type: string
  content?: string | null
  imageUrl?: string | null
  voiceNoteId?: string | null
  privacy?: string | null
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

interface FriendInfo {
  id: string
  status: string
  user: {
    id: string
    name: string
    username: string
    avatarColor: string
    avatarUrl?: string | null
    bio?: string | null
  } | null
}

export function ProfileView({ username }: { username: string | null }) {
  const user = useSada((s) => s.user)
  const setUser = useSada((s) => s.setUser)
  const setViewedUsername = useSada((s) => s.setViewedUsername)
  const setRecorderOpen = useSada((s) => s.setRecorderOpen)
  const openRecorder = useSada((s) => s.openRecorder)
  const setSettingsOpen = useSada((s) => s.setSettingsOpen)
  const openFollowList = useSada((s) => s.openFollowList)
  const setTab = useSada((s) => s.setTab)

  const [profile, setProfile] = useState<SadaProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [profileViews, setProfileViews] = useState<{ totalViews: number; uniqueViewers: number; recentViews: number } | null>(null)
  
  // Posts
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  
  // Friends
  const [friendsCount, setFriendsCount] = useState(0)
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null) // null=none, 'pending_sent', 'pending_received', 'accepted', 'blocked'
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [friendBusy, setFriendBusy] = useState(false)
  const [showFriendsList, setShowFriendsList] = useState(false)
  const [friendsList, setFriendsList] = useState<FriendInfo[]>([])
  const [friendsListType, setFriendsListType] = useState<'accepted' | 'received' | 'sent'>('accepted')
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const target = username || user?.username || null
  const isMe = !username || username === user?.username

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
    } catch {} finally { setLoading(false) }
  }, [target, username, user?.id])

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('الحد الأقصى 5 ميجا'); return }
    if (!file.type.startsWith('image/')) { toast.error('ملف غير صحيح'); return }
    setUploadingCover(true)
    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        try {
          const res = await fetch('/api/auth/update-cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coverImage: dataUrl }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            toast.error(err.error || 'فشل رفع الغلاف')
            return
          }
          const data = await res.json()
          if (data.coverUrl && profile) {
            // Update local profile state
            setProfile({ ...profile, user: { ...profile.user, coverUrl: data.coverUrl } as any })
            toast.success('تم تحديث الغلاف 🎉')
          }
        } catch {
          toast.error('فشل')
        } finally { setUploadingCover(false) }
      }
      reader.onerror = () => { toast.error('فشل قراءة الملف'); setUploadingCover(false) }
      reader.readAsDataURL(file)
    } catch {
      toast.error('فشل')
      setUploadingCover(false)
    }
    // Reset input so same file can be selected again
    if (e.target) e.target.value = ''
  }

  const loadPosts = useCallback(async () => {
    if (!profile?.user?.id) return
    setLoadingPosts(true)
    try {
      const res = await fetch(`/api/posts/user?userId=${profile.user.id}&limit=50`)
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {} finally { setLoadingPosts(false) }
  }, [profile?.user?.id])

  const loadFriendsCount = useCallback(async () => {
    if (!profile?.user?.id) return
    try {
      const res = await fetch(`/api/friends/list?type=accepted&userId=${profile.user.id}`)
      const data = await res.json()
      setFriendsCount(data.friends?.length || 0)
    } catch {}
  }, [profile?.user?.id])

  const checkFriendship = useCallback(async () => {
    if (!profile?.user?.id || isMe) return
    try {
      // Check if there's any friendship between us
      const res = await fetch(`/api/friends/list?type=accepted`)
      const data = await res.json()
      const found = (data.friends || []).find((f: FriendInfo) => f.user?.id === profile.user.id)
      if (found) {
        setFriendshipStatus('accepted')
        setFriendshipId(found.id)
        return
      }
      // Check sent requests
      const sentRes = await fetch(`/api/friends/list?type=sent`)
      const sentData = await sentRes.json()
      const sentFound = (sentData.friends || []).find((f: FriendInfo) => f.user?.id === profile.user.id)
      if (sentFound) {
        setFriendshipStatus('pending_sent')
        setFriendshipId(sentFound.id)
        return
      }
      // Check received requests
      const recRes = await fetch(`/api/friends/list?type=received`)
      const recData = await recRes.json()
      const recFound = (recData.friends || []).find((f: FriendInfo) => f.user?.id === profile.user.id)
      if (recFound) {
        setFriendshipStatus('pending_received')
        setFriendshipId(recFound.id)
        return
      }
      setFriendshipStatus(null)
      setFriendshipId(null)
    } catch {}
  }, [profile?.user?.id, isMe])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (profile) { loadPosts(); loadFriendsCount(); checkFriendship() } }, [profile, loadPosts, loadFriendsCount, checkFriendship])

  // Record profile view + fetch view stats (only if viewing other's profile)
  useEffect(() => {
    if (!profile?.user?.id || isMe) return
    // Record the view
    fetch('/api/profile/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileOwnerId: profile.user.id }),
    }).catch(() => {})
  }, [profile?.user?.id, isMe])

  // Fetch view stats for the profile owner
  useEffect(() => {
    if (!isMe) return
    fetch('/api/profile/views')
      .then((r) => r.json())
      .then((d) => {
        if (d.totalViews !== undefined) {
          setProfileViews({
            totalViews: d.totalViews,
            uniqueViewers: d.uniqueViewers,
            recentViews: d.recentViews,
          })
        }
      })
      .catch(() => {})
  }, [isMe])

  const toggleFollow = async () => {
    if (!profile || !user) return
    setFollowBusy(true)
    const newFollowing = !profile.isFollowing
    setProfile({ ...profile, isFollowing: newFollowing, stats: { ...profile.stats, followers: profile.stats.followers + (newFollowing ? 1 : -1) } })
    try {
      await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: profile.user.id, action: newFollowing ? 'follow' : 'unfollow' }),
      })
    } catch {
      setProfile({ ...profile, isFollowing: !newFollowing, stats: { ...profile.stats, followers: profile.stats.followers + (newFollowing ? -1 : 1) } })
    } finally { setFollowBusy(false) }
  }

  // === Friend Actions ===
  const sendFriendRequest = async () => {
    if (!profile?.user?.id) return
    setFriendBusy(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: profile.user.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setFriendshipStatus('pending_sent')
        toast.success('تم إرسال طلب الصداقة')
      } else {
        toast.error(data.error || 'فشل')
      }
    } catch { toast.error('فشل') } finally { setFriendBusy(false) }
  }

  const acceptFriendRequest = async () => {
    if (!friendshipId) return
    setFriendBusy(true)
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      })
      if (res.ok) {
        setFriendshipStatus('accepted')
        setFriendsCount(c => c + 1)
        toast.success('تم قبول طلب الصداقة')
      }
    } catch { toast.error('فشل') } finally { setFriendBusy(false) }
  }

  const removeFriend = async () => {
    if (!profile?.user?.id) return
    if (!confirm('متأكد من إلغاء الصداقة؟')) return
    setFriendBusy(true)
    try {
      await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUserId: profile.user.id }),
      })
      setFriendshipStatus(null)
      setFriendsCount(c => Math.max(0, c - 1))
      toast.success('تم إلغاء الصداقة')
    } catch { toast.error('فشل') } finally { setFriendBusy(false) }
  }

  // === Friends List ===
  const loadFriendsList = async (type: 'accepted' | 'received' | 'sent') => {
    setFriendsListType(type)
    setLoadingFriends(true)
    setShowFriendsList(true)
    try {
      const res = await fetch(`/api/friends/list?type=${type}`)
      const data = await res.json()
      setFriendsList(data.friends || [])
    } catch {} finally { setLoadingFriends(false) }
  }

  const deleteVoiceNote = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/users/me?id=${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف التسجيل')
        setProfile(p => p ? { ...p, voiceNotes: p.voiceNotes.filter(n => n.id !== deleteId), stats: { ...p.stats, voiceNotes: p.stats.voiceNotes - 1 } } : null)
      }
    } catch { toast.error('فشل الحذف') } finally { setDeleteId(null) }
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
        <Button className="mt-4" onClick={() => { setViewedUsername(null); setTab('today') }}>العودة</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Profile header with cover photo (Facebook-style) */}
      <Card className="overflow-hidden rounded-3xl sada-glass p-0">
        {/* Cover photo */}
        <div
          className="h-32 sm:h-48 relative group"
          style={{
            background: (profile.user as any).coverUrl
              ? `url(${(profile.user as any).coverUrl}) center/cover`
              : `linear-gradient(135deg, ${profile.user.avatarColor}, ${profile.user.avatarColor}88)`,
          }}
        >
          {isMe && (
            <>
              <label
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="تغيير صورة الغلاف"
              >
                {uploadingCover ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> جاري الرفع...
                  </>
                ) : (
                  <>
                    <Camera className="h-3 w-3" /> تغيير الغلاف
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                  className="hidden"
                />
              </label>
              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center pointer-events-none">
                {!uploadingCover && (
                  <span className="opacity-0 group-hover:opacity-100 transition text-white text-xs bg-black/40 px-3 py-1 rounded-full">
                    اضغط لتغيير الغلاف
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Avatar + name section */}
        <div className="px-6 pb-4 -mt-12 sm:-mt-16 relative">
          <div className="flex items-end gap-4">
            <div className="rounded-full border-4 border-background">
              <Avatar
                name={profile.user.name}
                color={profile.user.avatarColor}
                imageUrl={profile.user.avatarUrl}
                size="xl"
              />
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-cairo">{profile.user.name}</h2>
                {(profile.user as any).isVerified && (
                  <span className="text-primary text-sm">✓</span>
                )}
                {isMe && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSettingsOpen(true)}>
                    <Pencil className="h-3 w-3 ml-1" /> تعديل
                  </Button>
                )}
              </div>
              <div className="text-sm text-muted-foreground mb-1" dir="ltr">@{profile.user.username}</div>
            </div>
          </div>

          {/* Bio + info (below avatar row, inside px-6) */}
          {profile.user.bio && <p className="text-sm mt-2 leading-relaxed">{profile.user.bio}</p>}
          <p className="text-[11px] text-muted-foreground mt-2">انضم في {formatArabicDate(profile.user.createdAt)}</p>

            {/* Voice Bio — 30-second audio introduction */}
            {(profile.user.voiceBioUrl || isMe) && (
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-accent/10 to-transparent border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-accent-foreground/80">
                    <Mic className="h-3.5 w-3.5" />
                    <span className="font-medium">تعريف صوتي</span>
                  </div>
                  {isMe && (
                    <button
                      onClick={() => openRecorder('voice-bio' as any)}
                      className="text-[10px] text-muted-foreground hover:text-accent transition"
                      title={profile.user.voiceBioUrl ? 'تغيير التعريف الصوتي' : 'أضف تعريف صوتي'}
                    >
                      {profile.user.voiceBioUrl ? 'تغيير' : 'سجّل'}
                    </button>
                  )}
                </div>
                {profile.user.voiceBioUrl ? (
                  <>
                    <VoicePlayer
                      src={profile.user.voiceBioUrl}
                      durationSec={profile.user.voiceBioDuration || 30}
                      accent="accent"
                      title="تعريف صوتي"
                      artist={profile.user.name}
                      album="بروفايل صدى"
                      artworkUrl={profile.user.avatarUrl || undefined}
                    />
                    {isMe && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/profile/voice-bio', { method: 'DELETE' })
                            if (res.ok) {
                              setProfile({
                                ...profile,
                                user: { ...profile.user, voiceBioUrl: null, voiceBioDuration: 0 },
                              })
                              toast.success('تم حذف التعريف الصوتي')
                            }
                          } catch {
                            toast.error('فشل الحذف')
                          }
                        }}
                        className="text-[10px] text-muted-foreground hover:text-red-500 transition mt-2"
                      >
                        حذف التعريف الصوتي
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {isMe
                      ? 'سجّل تعريف صوتي قصير (30 ثانية) عشان الناس تتعرف عليك'
                      : 'لم يسجّل تعريفاً صوتياً بعد'}
                  </p>
                )}
              </div>
            )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="font-bold text-lg tabular-nums">{formatCount(profile.stats.voiceNotes)}</div>
            <div className="text-[11px] text-muted-foreground">صدى</div>
          </div>
          <button onClick={() => openFollowList(profile.user.id, 'followers')} className="text-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition">
            <div className="font-bold text-lg tabular-nums">{formatCount(profile.stats.followers)}</div>
            <div className="text-[11px] text-muted-foreground">متابع</div>
          </button>
          <button onClick={() => openFollowList(profile.user.id, 'following')} className="text-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition">
            <div className="font-bold text-lg tabular-nums">{formatCount(profile.stats.following)}</div>
            <div className="text-[11px] text-muted-foreground">يتابع</div>
          </button>
          <button onClick={() => isMe ? loadFriendsList('accepted') : undefined} className="text-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition">
            <div className="font-bold text-lg tabular-nums">{formatCount(friendsCount)}</div>
            <div className="text-[11px] text-muted-foreground">أصدقاء</div>
          </button>
        </div>

        {/* Profile Views (only for the owner) */}
        {isMe && profileViews && (
          <div className="mt-3 p-3 rounded-xl bg-muted/20 border border-border/40">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">مشاهدات البروفايل</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground tabular-nums">{formatCount(profileViews.totalViews)}</span> إجمالي
                </span>
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground tabular-nums">{formatCount(profileViews.uniqueViewers)}</span> فريد
                </span>
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground tabular-nums">{formatCount(profileViews.recentViews)}</span> هذا الأسبوع
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {isMe ? (
            <>
              <Button onClick={() => setRecorderOpen(true)} className="flex-1 gap-2 bg-primary hover:bg-primary/90">
                <Mic className="h-4 w-4" /> سجّل صدى جديد
              </Button>
              {friendsCount > 0 && (
                <Button variant="outline" size="icon" onClick={() => loadFriendsList('accepted')} aria-label="أصدقاء">
                  <Users className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Follow button */}
              <Button
                onClick={toggleFollow}
                disabled={followBusy}
                variant={profile.isFollowing ? 'outline' : 'default'}
                className="flex-1 gap-2"
              >
                {profile.isFollowing ? <><UserCheck className="h-4 w-4" /> متابع</> : <><UserPlus className="h-4 w-4" /> متابعة</>}
              </Button>

              {/* Friend button */}
              {friendshipStatus === 'accepted' && (
                <Button variant="outline" disabled={friendBusy} className="gap-2">
                  <UserCheck className="h-4 w-4" /> صديق
                  <button onClick={removeFriend} className="mr-1 hover:text-destructive" title="إلغاء الصداقة">
                    <UserMinus className="h-3 w-3" />
                  </button>
                </Button>
              )}
              {friendshipStatus === 'pending_sent' && (
                <Button variant="outline" disabled className="gap-2">
                  <UserPlus2 className="h-4 w-4" /> طلب مرسل
                </Button>
              )}
              {friendshipStatus === 'pending_received' && (
                <Button onClick={acceptFriendRequest} disabled={friendBusy} className="gap-2 bg-primary">
                  <UserCheck className="h-4 w-4" /> قبول الصداقة
                </Button>
              )}
              {friendshipStatus === null && (
                <Button onClick={sendFriendRequest} disabled={friendBusy} variant="outline" className="gap-2">
                  <UserPlus2 className="h-4 w-4" /> أضف صديق
                </Button>
              )}

              {/* Message button (friends only) */}
              {friendshipStatus === 'accepted' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    useSada.getState().setTab('messages')
                  }}
                  aria-label="رسالة"
                >
                  <Mic className="h-4 w-4 rotate-45" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Friends requests (me only) */}
        {isMe && (
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => loadFriendsList('received')}>
              <UserPlus2 className="h-3 w-3" /> طلبات واردة
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => loadFriendsList('sent')}>
              <UserPlus2 className="h-3 w-3" /> طلبات مرسلة
            </Button>
          </div>
        )}
        </div>
      </Card>

      {/* Posts */}
      <div>
        <h3 className="font-semibold text-sm mb-3 px-1 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          {isMe ? 'بوستاتي' : 'المنشورات'}
          <span className="text-muted-foreground font-normal">({posts.length})</span>
        </h3>

        {loadingPosts ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-dashed">
            <p className="text-sm text-muted-foreground">
              {isMe ? 'لسه مانشرتش بوست. ابدأ بنشر أول بوست!' : 'مفيش بوستات عامة لسه'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onOpenProfile={(u) => { setViewedUsername(u); setTab('profile') }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Voice Notes */}
      <div>
        <h3 className="font-semibold text-sm mb-3 px-1 flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          {isMe ? 'صدى صوتك' : 'الأصداء'}
          <span className="text-muted-foreground font-normal">({profile.voiceNotes.length})</span>
        </h3>

        {profile.voiceNotes.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-dashed">
            <Mic className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isMe ? 'لسه ما سجلتش صدى. ابدأ أول تسجيل!' : 'هذا المستخدم لسه ما سجلش صدى'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {profile.voiceNotes.map((n) => (
              <Card key={n.id} className="p-4 sada-glass rounded-2xl sada-fade-up">
                {(n as any).isPinned && (
                  <div className="mb-2 flex items-center gap-1 text-[10px] text-primary">
                    <Pin className="h-3 w-3" />
                    <span>مثبت</span>
                  </div>
                )}
                {n.prompt && (
                  <div className="mb-3 p-3 rounded-xl bg-primary/10 border border-primary/15">
                    <div className="text-[11px] text-primary/80 mb-1">رد على سؤال {formatArabicDate(n.prompt.date)}</div>
                    <div className="text-sm font-medium">{n.prompt.text}</div>
                  </div>
                )}
                <VoicePlayer src={n.audioData} durationSec={n.durationSec} />
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>{timeAgo(n.createdAt)}</span>
                  <span className="flex items-center gap-1"><Play className="h-3 w-3" />{formatCount(n.plays)} تشغيل</span>
                </div>
                {isMe && (
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/voice-notes/pin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ voiceNoteId: n.id, isPinned: !(n as any).isPinned }),
                          })
                          const data = await res.json()
                          if (res.ok) {
                            // Update local state
                            setProfile((p) => p ? {
                              ...p,
                              voiceNotes: p.voiceNotes.map((vn) =>
                                vn.id === n.id ? { ...vn, isPinned: data.isPinned } as any : vn
                              ),
                            } : null)
                            toast.success(data.isPinned ? 'تم تثبيت الصدى على بروفايلك' : 'تم إلغاء التثبيت')
                          } else {
                            toast.error(data.error)
                          }
                        } catch {
                          toast.error('فشل التثبيت')
                        }
                      }}
                      className={`text-xs hover:underline flex items-center gap-1 ${(n as any).isPinned ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Pin className="h-3 w-3" /> {(n as any).isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    </button>
                    <button onClick={() => setDeleteId(n.id)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> حذف
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التسجيل؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteVoiceNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Friends List Modal */}
      {showFriendsList && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowFriendsList(false)}>
          <div className="sada-glass w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {friendsListType === 'accepted' ? 'الأصدقاء' : friendsListType === 'received' ? 'طلبات واردة' : 'طلبات مرسلة'}
              </h2>
              <button onClick={() => setShowFriendsList(false)} className="p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            {isMe && (
              <div className="flex gap-2 mb-3 p-1 bg-muted/40 rounded-xl">
                {(['accepted', 'received', 'sent'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => loadFriendsList(t)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${friendsListType === t ? 'bg-background shadow' : 'text-muted-foreground'}`}
                  >
                    {t === 'accepted' ? 'أصدقاء' : t === 'received' ? 'واردة' : 'مرسلة'}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingFriends ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : friendsList.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">مفيش حاجة هنا</p>
              ) : (
                friendsList.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition">
                    <Avatar name={f.user?.name || '?'} color={f.user?.avatarColor || '#888'} imageUrl={f.user?.avatarUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{f.user?.name}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">@{f.user?.username}</div>
                    </div>
                    <button
                      onClick={() => {
                        setShowFriendsList(false)
                        setViewedUsername(f.user?.username || null)
                        setTab('profile')
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      عرض
                    </button>
                    {friendsListType === 'received' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await fetch('/api/friends/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ friendshipId: f.id }) })
                          toast.success('تم القبول')
                          loadFriendsList('received')
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        قبول
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
