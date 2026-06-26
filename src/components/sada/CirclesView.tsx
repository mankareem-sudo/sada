'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import {
  Plus,
  Globe,
  Lock,
  EyeOff,
  Users,
  ChevronLeft,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import { timeAgo, formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Circle {
  id: string
  name: string
  description?: string | null
  type: 'public' | 'private' | 'secret'
  rules?: string | null
  coverColor: string
  membersCount: number
  createdAt: string
  owner?: {
    id: string
    username: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
  } | null
  myRole?: string | null
  isMember?: boolean
}

export function CirclesView() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list')
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [feedNotes, setFeedNotes] = useState<any[]>([])
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const user = useSada((s) => s.user)

  const loadCircles = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/circles/list?type=${filter}&limit=30`)
      const data = await res.json()
      setCircles(data.circles || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCircles()
  }, [filter])

  const openCircle = async (circle: Circle) => {
    setSelectedCircle(circle)
    setView('detail')
    setLoadingFeed(true)
    try {
      const res = await fetch(`/api/circles/feed?circleId=${circle.id}&limit=30`)
      const data = await res.json()
      if (res.ok) {
        setFeedNotes(data.notes || [])
      } else {
        toast.error(data.error)
        setFeedNotes([])
      }
    } catch {
      toast.error('فشل تحميل المحتوى')
    } finally {
      setLoadingFeed(false)
    }
  }

  const joinCircle = async (circleId: string) => {
    if (!user) {
      toast.error('سجّل دخول الأول')
      return
    }
    try {
      const res = await fetch('/api/circles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circleId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'تم الانضمام 🎉')
        loadCircles()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('فشل الانضمام')
    }
  }

  const leaveCircle = async (circleId: string) => {
    try {
      const res = await fetch('/api/circles/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circleId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('غادرت الدايرة')
        loadCircles()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('فشل المغادرة')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg mb-1">الدوائر الصوتية</h2>
          <p className="text-sm text-muted-foreground">
            مجتمعات صوتية حول مواضيع مشتركة
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => setView('create')}
        >
          <Plus className="h-4 w-4" />
          دايرة جديدة
        </Button>
      </div>

      {/* Filter tabs */}
      {view === 'list' && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition',
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
          >
            كل الدوائر
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition',
              filter === 'mine'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
          >
            دوائري
          </button>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : circles.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                {filter === 'mine'
                  ? 'ما أنضممت لأي دايرة لسه'
                  : 'مفيش دوائر لسه — كن أول واحد ينشئ دايرة'}
              </p>
              <Button variant="outline" size="sm" onClick={() => setView('create')}>
                <Plus className="h-4 w-4 ml-1" /> أنشئ دايرة
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {circles.map((circle) => (
                <Card key={circle.id} className="p-4 rounded-2xl">
                  <div className="flex items-start gap-3">
                    {/* Cover */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${circle.coverColor}, ${circle.coverColor}aa)` }}
                    >
                      <Users className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{circle.name}</h3>
                        {circle.type === 'public' && <Globe className="h-3 w-3 text-muted-foreground" />}
                        {circle.type === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {circle.type === 'secret' && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      {circle.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {circle.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {formatCount(circle.membersCount)} عضو
                        </span>
                        {circle.owner && (
                          <span>· مالك: {circle.owner.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openCircle(circle)}
                    >
                      فتح
                    </Button>
                    {circle.isMember ? (
                      circle.myRole !== 'owner' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => leaveCircle(circle.id)}
                        >
                          مغادرة
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinCircle(circle.id)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" /> انضمام
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail view */}
      {view === 'detail' && selectedCircle && (
        <div>
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            رجوع للدوائر
          </button>

          <Card
            className="p-5 rounded-3xl mb-4"
            style={{
              background: `linear-gradient(135deg, ${selectedCircle.coverColor}30, transparent)`,
              borderColor: `${selectedCircle.coverColor}40`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: selectedCircle.coverColor }}
              >
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{selectedCircle.name}</h2>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {selectedCircle.type === 'public' && <><Globe className="h-3 w-3" /> عامة</>}
                  {selectedCircle.type === 'private' && <><Lock className="h-3 w-3" /> خاصة</>}
                  {selectedCircle.type === 'secret' && <><EyeOff className="h-3 w-3" /> سرية</>}
                  <span>· {formatCount(selectedCircle.membersCount)} عضو</span>
                </div>
              </div>
            </div>
            {selectedCircle.description && (
              <p className="text-sm text-muted-foreground mt-2">{selectedCircle.description}</p>
            )}
            {selectedCircle.rules && (
              <div className="mt-3 p-2 rounded-xl bg-muted/20">
                <div className="text-[11px] text-muted-foreground mb-1">القواعد:</div>
                <p className="text-xs">{selectedCircle.rules}</p>
              </div>
            )}
          </Card>

          {/* Circle feed */}
          {loadingFeed ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : feedNotes.length === 0 ? (
            <Card className="p-6 text-center rounded-2xl border-dashed">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                مفيش أصوات في هذه الدايرة لسه
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {feedNotes.map((note) => (
                <Card key={note.id} className="p-4 rounded-2xl">
                  {note.user && (
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        name={note.user.name}
                        color={note.user.avatarColor}
                        imageUrl={note.user.avatarUrl}
                        size="sm"
                        isVerified={note.user.isVerified}
                      />
                      <div className="text-right">
                        <div className="text-sm font-medium">{note.user.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {timeAgo(note.createdAt)}
                        </div>
                      </div>
                    </div>
                  )}
                  {note.description && (
                    <p className="text-sm mb-2">{note.description}</p>
                  )}
                  <VoicePlayer
                    src={note.audioData}
                    durationSec={note.durationSec}
                    title={note.description || 'تسجيل صوتي'}
                    artist={note.user?.name}
                    album={selectedCircle.name}
                    artworkUrl={note.user?.avatarUrl || undefined}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create view */}
      {view === 'create' && (
        <CreateCircleForm
          onClose={() => setView('list')}
          onCreated={() => {
            setView('list')
            setFilter('mine')
            loadCircles()
          }}
        />
      )}
    </div>
  )
}

function CreateCircleForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'public' | 'private' | 'secret'>('public')
  const [rules, setRules] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (name.trim().length < 3) {
      toast.error('اسم الدايرة لازم 3 أحرف على الأقل')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/circles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          rules: rules.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم إنشاء الدايرة 🎉')
        onCreated()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('فشل إنشاء الدايرة')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button
        onClick={onClose}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        إلغاء
      </button>

      <Card className="p-5 rounded-2xl space-y-4">
        <h3 className="font-bold text-lg">إنشاء دايرة جديدة</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">اسم الدايرة *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="مثال: أصوات في التقنية"
            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border focus:border-primary outline-none text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="إيه موضوع الدايرة؟"
            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border focus:border-primary outline-none text-sm resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">نوع الدايرة</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'public', label: 'عامة', icon: Globe, desc: 'أي حد يشوف وينضم' },
              { v: 'private', label: 'خاصة', icon: Lock, desc: 'أي حد يشوف، انضمام بموافقة' },
              { v: 'secret', label: 'سرية', icon: EyeOff, desc: 'بدعوة فقط' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v as any)}
                className={cn(
                  'p-3 rounded-xl border text-center transition',
                  type === opt.v
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <opt.icon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs font-medium">{opt.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">القواعد (اختياري)</label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="مثال: احترم الآراء، مفيش إساءة..."
            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border focus:border-primary outline-none text-sm resize-none"
          />
        </div>

        <Button
          onClick={submit}
          disabled={submitting || name.trim().length < 3}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            'إنشاء الدايرة'
          )}
        </Button>
      </Card>
    </div>
  )
}
