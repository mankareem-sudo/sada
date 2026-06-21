'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSada } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import {
  Shield,
  Plus,
  Trash2,
  Flag,
  Check,
  X,
  Loader2,
  Users,
  Mic,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { formatArabicDate, timeAgo, formatCount } from '@/lib/format'
import { toast } from 'sonner'

type Prompt = {
  id: string
  text: string
  date: string
  topic?: string | null
  voiceNotesCount: number
}

type Report = {
  id: string
  reason: string
  comment?: string | null
  status: string
  createdAt: string
  reporter: { id: string; name: string; username: string; avatarColor: string }
  voiceNote: {
    id: string
    durationSec: number
    audioData: string
    description?: string | null
    createdAt: string
    user: { id: string; name: string; username: string; avatarColor: string }
  } | null
}

type Stats = {
  users: number
  voiceNotes: number
  prompts: number
  comments: number
  likes: number
  bookmarks: number
  reports: number
  pendingReports: number
  follows: number
  donations: number
  totalDonations: number
  activeThisWeek: number
} | null

const REASON_LABELS: Record<string, string> = {
  religion: 'إساءة للأديان',
  politics: 'سياسة',
  insult: 'إهانة',
  spam: 'سبام',
  other: 'أخرى',
}

export function AdminPanel() {
  const [tab, setTab] = useState<'stats' | 'prompts' | 'reports'>('stats')
  const [stats, setStats] = useState<Stats>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)

  // New prompt form
  const [newPromptText, setNewPromptText] = useState('')
  const [newPromptDate, setNewPromptDate] = useState('')
  const [newPromptTopic, setNewPromptTopic] = useState('')

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data)
    } catch {
      // ignore
    }
  }, [])

  const loadPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/prompts')
      const data = await res.json()
      setPrompts(data.prompts || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports?status=pending')
      const data = await res.json()
      setReports(data.reports || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (tab === 'prompts') loadPrompts()
    if (tab === 'reports') loadReports()
    if (tab === 'stats') loadStats()
  }, [tab, loadPrompts, loadReports, loadStats])

  const createPrompt = async () => {
    if (!newPromptText.trim() || !newPromptDate) {
      toast.error('النص والتاريخ مطلوبان')
      return
    }
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newPromptText,
          date: newPromptDate,
          topic: newPromptTopic || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل')
        return
      }
      toast.success('تم إضافة السؤال')
      setNewPromptText('')
      setNewPromptDate('')
      setNewPromptTopic('')
      loadPrompts()
    } catch {
      toast.error('فشل')
    }
  }

  const deletePrompt = async (id: string) => {
    if (!confirm('متأكد من حذف هذا السؤال؟')) return
    try {
      const res = await fetch(`/api/admin/prompts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف السؤال')
        loadPrompts()
      }
    } catch {
      toast.error('فشل الحذف')
    }
  }

  const handleReport = async (id: string, status: 'removed' | 'dismissed') => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        toast.success(
          status === 'removed' ? 'تم حذف التسجيل' : 'تم رفض البلاغ'
        )
        loadReports()
        loadStats()
      }
    } catch {
      toast.error('فشل')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="font-bold text-lg">لوحة الإدارة</h2>
        <Badge variant="outline" className="text-orange-400 border-orange-400">
          Admin
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'stats' ? 'bg-background shadow' : 'text-muted-foreground'
          }`}
        >
          إحصائيات
        </button>
        <button
          onClick={() => setTab('prompts')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'prompts' ? 'bg-background shadow' : 'text-muted-foreground'
          }`}
        >
          الأسئلة ({prompts.length})
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition relative ${
            tab === 'reports' ? 'bg-background shadow' : 'text-muted-foreground'
          }`}
        >
          البلاغات
          {stats && stats.pendingReports > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {stats.pendingReports}
            </span>
          )}
        </button>
      </div>

      {/* Stats tab */}
      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              icon={Users}
              label="مستخدمين"
              value={stats.users}
              color="text-blue-400"
            />
            <StatCard
              icon={Mic}
              label="أصداء"
              value={stats.voiceNotes}
              color="text-primary"
            />
            <StatCard
              icon={TrendingUp}
              label="نشطون هذا الأسبوع"
              value={stats.activeThisWeek}
              color="text-emerald-400"
            />
            <StatCard
              icon={Flag}
              label="بلاغات معلّقة"
              value={stats.pendingReports}
              color="text-destructive"
              alert={stats.pendingReports > 0}
            />
            <StatCard
              icon={AlertTriangle}
              label="إجمالي البلاغات"
              value={stats.reports}
              color="text-amber-400"
            />
            <StatCard
              icon={Users}
              label="متابعات"
              value={stats.follows}
              color="text-pink-400"
            />
            <StatCard
              icon={Mic}
              label="تعليقات"
              value={stats.comments}
              color="text-cyan-400"
            />
            <StatCard
              icon={Mic}
              label="إعجابات"
              value={stats.likes}
              color="text-rose-400"
            />
            <StatCard
              icon={Mic}
              label="محفوظات"
              value={stats.bookmarks}
              color="text-violet-400"
            />
          </div>

          {stats.donations > 0 && (
            <Card className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
              <div className="text-sm text-muted-foreground mb-1">
                إجمالي الدعم المالي
              </div>
              <div className="text-3xl font-bold text-primary">
                ${stats.totalDonations.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                من {stats.donations} داعم 🙏
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Prompts tab */}
      {tab === 'prompts' && (
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة سؤال جديد
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="np-text" className="text-xs">نص السؤال</Label>
                <Textarea
                  id="np-text"
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="مثال: إيه أكبر تحدي واجهته هذا الشهر؟"
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="np-date" className="text-xs">التاريخ</Label>
                  <Input
                    id="np-date"
                    type="date"
                    value={newPromptDate}
                    onChange={(e) => setNewPromptDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="np-topic" className="text-xs">الموضوع (اختياري)</Label>
                  <Input
                    id="np-topic"
                    value={newPromptTopic}
                    onChange={(e) => setNewPromptTopic(e.target.value)}
                    placeholder="tech, life..."
                    maxLength={50}
                  />
                </div>
              </div>
              <Button
                onClick={createPrompt}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {prompts.map((p) => (
                <Card key={p.id} className="p-3 rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">
                        {formatArabicDate(p.date)}
                        {p.topic && (
                          <Badge variant="outline" className="mr-2 text-[10px]">
                            {p.topic}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium">{p.text}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {formatCount(p.voiceNotesCount)} صدى
                      </div>
                    </div>
                    <button
                      onClick={() => deletePrompt(p.id)}
                      className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports tab */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-10 text-center rounded-2xl border-dashed">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                مفيش بلاغات معلّقة. كل حاجة تحت السيطرة ✨
              </p>
            </Card>
          ) : (
            reports.map((r) => (
              <Card key={r.id} className="p-4 rounded-2xl border-destructive/30">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="destructive" className="text-[10px]">
                    {REASON_LABELS[r.reason] || r.reason}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(r.createdAt)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    · بلّغ: {r.reporter.name}
                  </span>
                </div>

                {r.comment && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg mb-3">
                    &ldquo;{r.comment}&rdquo;
                  </div>
                )}

                {r.voiceNote && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        name={r.voiceNote.user.name}
                        color={r.voiceNote.user.avatarColor}
                        size="sm"
                      />
                      <div className="text-xs">
                        <div className="font-medium">
                          {r.voiceNote.user.name}
                        </div>
                        <div className="text-muted-foreground" dir="ltr">
                          @{r.voiceNote.user.username} ·{' '}
                          {timeAgo(r.voiceNote.createdAt)}
                        </div>
                      </div>
                    </div>
                    {r.voiceNote.description && (
                      <p className="text-xs mb-2 text-muted-foreground">
                        {r.voiceNote.description}
                      </p>
                    )}
                    <VoicePlayer
                      src={r.voiceNote.audioData}
                      durationSec={r.voiceNote.durationSec}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReport(r.id, 'removed')}
                    className="gap-1 flex-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    حذف التسجيل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReport(r.id, 'dismissed')}
                    className="gap-1 flex-1"
                  >
                    <X className="h-3 w-3" />
                    رفض البلاغ
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  alert,
}: {
  icon: any
  label: string
  value: number
  color: string
  alert?: boolean
}) {
  return (
    <Card
      className={`p-3 rounded-2xl ${alert ? 'border-destructive/50 bg-destructive/5' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{formatCount(value)}</div>
    </Card>
  )
}
