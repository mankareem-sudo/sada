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
  const [tab, setTab] = useState<'stats' | 'prompts' | 'reports' | 'moderation' | 'bots'>('stats')
  const [stats, setStats] = useState<Stats>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [moderationQueue, setModerationQueue] = useState<any[]>([])
  const [moderationFilter, setModerationFilter] = useState<'pending' | 'approved' | 'removed' | 'warned'>('pending')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [activating, setActivating] = useState(false)
  const [botStatus, setBotStatus] = useState<string | null>(null)
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

  const loadModerationQueue = useCallback(async (status: 'pending' | 'approved' | 'removed' | 'warned' = 'pending') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/moderation-queue?status=${status}&limit=30`)
      const data = await res.json()
      setModerationQueue(data.queue || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const scanForViolations = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/moderation/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      })
      const data = await res.json()
      if (res.ok) {
        setScanResult(data.message || `تم فحص ${data.scanned} عنصر`)
        // Reload queue
        loadModerationQueue(moderationFilter)
      } else {
        setScanResult(data.error || 'فشل الفحص')
      }
    } catch (e) {
      setScanResult('فشل الفحص')
    } finally {
      setScanning(false)
    }
  }

  const resolveModerationItem = async (logId: string, action: 'approve' | 'remove' | 'warn') => {
    try {
      const res = await fetch('/api/admin/moderation-queue/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, action }),
      })
      if (res.ok) {
        loadModerationQueue(moderationFilter)
      }
    } catch {}
  }

  // === Bot Management ===
  const seedBots = async (count: number = 100) => {
    setSeeding(true)
    setBotStatus(null)
    try {
      const res = await fetch('/api/bots/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
      const data = await res.json()
      if (res.ok) {
        setBotStatus(`✅ تم إنشاء ${data.created} بوت مصري${data.errors > 0 ? ` (${data.errors} أخطاء)` : ''}`)
        loadStats() // Refresh stats
      } else {
        setBotStatus(`❌ ${data.error || 'فشل'}`)
      }
    } catch (e) {
      setBotStatus('❌ فشل الاتصال')
    } finally {
      setSeeding(false)
    }
  }

  const activateBots = async (actions: number = 10) => {
    setActivating(true)
    setBotStatus(null)
    try {
      const res = await fetch('/api/bots/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      })
      const data = await res.json()
      if (res.ok) {
        setBotStatus(`✅ نشاط البوتات: ${data.postsCreated} بوست، ${data.likesGiven} لايك، ${data.commentsCreated} تعليق (${data.aiComments} ذكي AI)، ${data.voiceLikesGiven} لايك صوت`)
        loadStats()
      } else {
        setBotStatus(`❌ ${data.error || 'فشل'}`)
      }
    } catch (e) {
      setBotStatus('❌ فشل الاتصال')
    } finally {
      setActivating(false)
    }
  }

  const fixAvatars = async () => {
    setSeeding(true)
    setBotStatus(null)
    try {
      const res = await fetch('/api/bots/fix-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setBotStatus(`✅ تم تحديث ${data.updated} صورة بروفايل للبوتات`)
      } else {
        setBotStatus(`❌ ${data.error || 'فشل'}`)
      }
    } catch (e) {
      setBotStatus('❌ فشل الاتصال')
    } finally {
      setSeeding(false)
    }
  }

  const cleanupBots = async () => {
    setSeeding(true)
    setBotStatus(null)
    try {
      const res = await fetch('/api/bots/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setBotStatus(`🗑️ تم مسح: ${data.deletedPosts} بوست، ${data.deletedComments} تعليق، ${data.deletedPostLikes} لايك`)
        loadStats()
      } else {
        setBotStatus(`❌ ${data.error || 'فشل'}`)
      }
    } catch (e) {
      setBotStatus('❌ فشل الاتصال')
    } finally {
      setSeeding(false)
    }
  }

  const connectBots = async () => {
    setSeeding(true)
    setBotStatus(null)
    try {
      const res = await fetch('/api/bots/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setBotStatus(`🔗 تم ربط البوتات: ${data.followsCreated} متابعة، ${data.friendshipsCreated} صداقة، ${data.pendingRequests} طلب معلّق`)
        loadStats()
      } else {
        setBotStatus(`❌ ${data.error || 'فشل'}`)
      }
    } catch (e) {
      setBotStatus('❌ فشل الاتصال')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (tab === 'prompts') loadPrompts()
    if (tab === 'reports') loadReports()
    if (tab === 'moderation') loadModerationQueue(moderationFilter)
    if (tab === 'stats') loadStats()
  }, [tab, loadPrompts, loadReports, loadModerationQueue, loadStats, moderationFilter])

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
        <button
          onClick={() => setTab('moderation')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'moderation' ? 'bg-background shadow' : 'text-muted-foreground'
          }`}
        >
          🤖 المراجعة
        </button>
        <button
          onClick={() => setTab('bots')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'bots' ? 'bg-background shadow' : 'text-muted-foreground'
          }`}
        >
          👥 البوتات
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

      {/* Moderation tab — AI-powered content review */}
      {tab === 'moderation' && (
        <div className="space-y-4">
          {/* AI Scan button */}
          <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <span>🤖</span>
                  فحص ذكي بالموديلات المجانية
                </h3>
                <p className="text-xs text-muted-foreground">
                  افحص أحدث المنشورات والتعليقات تلقائياً للكشف عن المخالفات
                </p>
                {scanResult && (
                  <p className="text-xs text-primary mt-2">{scanResult}</p>
                )}
              </div>
              <Button
                onClick={scanForViolations}
                disabled={scanning}
                size="sm"
                className="gap-2 shrink-0"
              >
                {scanning ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    جاري الفحص...
                  </>
                ) : (
                  'فحص الآن'
                )}
              </Button>
            </div>
          </Card>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['pending', 'approved', 'removed', 'warned'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setModerationFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  moderationFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {status === 'pending' ? 'للمراجعة' : status === 'approved' ? 'موافق عليه' : status === 'removed' ? 'محذوف' : 'مُحذَّر'}
              </button>
            ))}
          </div>

          {/* Moderation queue */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : moderationQueue.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <p className="text-sm text-muted-foreground">
                {moderationFilter === 'pending' ? 'مفيش محتوى للمراجعة 🎉' : 'مفيش سجلات في هذه الحالة'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {moderationQueue.map((item) => (
                <Card
                  key={item.id}
                  className={`p-4 rounded-2xl ${
                    item.severity >= 70 ? 'border-destructive/50 bg-destructive/5' :
                    item.severity >= 40 ? 'border-amber-500/50 bg-amber-500/5' : ''
                  }`}
                >
                  {/* User info */}
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar
                      name={item.user?.name || '?'}
                      color={item.user?.avatarColor || '#888'}
                      imageUrl={item.user?.avatarUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.user?.name || 'مستخدم'}</div>
                      <div className="text-[10px] text-muted-foreground">
                        @{item.user?.username} · {item.contentType === 'post' ? 'منشور' : 'تعليق'} · {new Date(item.createdAt).toLocaleDateString('ar')}
                      </div>
                    </div>
                    {/* Severity badge */}
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.severity >= 70 ? 'bg-destructive/20 text-destructive' :
                      item.severity >= 40 ? 'bg-amber-500/20 text-amber-600' :
                      'bg-muted/30 text-muted-foreground'
                    }`}>
                      {item.severity}%
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-muted/30 rounded-xl p-3 mb-3">
                    <p className="text-sm whitespace-pre-wrap break-words">{item.text}</p>
                  </div>

                  {/* AI analysis */}
                  <div className="text-xs text-muted-foreground mb-3 space-y-1">
                    <div>
                      <span className="font-medium">التحليل:</span> {item.explanation}
                    </div>
                    <div>
                      <span className="font-medium">الفئات:</span>{' '}
                      {(item.categories || []).map((cat: string) => {
                        const labels: Record<string, string> = {
                          hate_speech: 'خطاب كراهية',
                          harassment: 'مضايقة',
                          bullying: 'تنمر',
                          insults: 'إهانات',
                          profanity: 'ألفاظ نابية',
                          spam: 'سبام',
                          threats: 'تهديدات',
                          explicit_content: 'محتوى صريح',
                          personal_info: 'معلومات شخصية',
                        }
                        return labels[cat] || cat
                      }).join('، ')}
                    </div>
                    <div>
                      <span className="font-medium">الإجراء المقترح:</span>{' '}
                      {item.action === 'allow' ? 'السماح' :
                       item.action === 'warn' ? 'تحذير' :
                       item.action === 'flag' ? 'مراجعة' : 'حظر'}
                      {' · '}
                      <span className="font-medium">الموديل:</span> {item.model}
                      {item.userWarnings > 0 && (
                        <span className="text-destructive font-medium"> · تحذيرات المستخدم: {item.userWarnings}</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons (only for pending items) */}
                  {item.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveModerationItem(item.id, 'approve')}
                        className="gap-1 flex-1"
                      >
                        ✅ موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveModerationItem(item.id, 'warn')}
                        className="gap-1 flex-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                      >
                        ⚠️ تحذير
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveModerationItem(item.id, 'remove')}
                        className="gap-1 flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        🗑️ حذف
                      </Button>
                    </div>
                  )}

                  {/* Status badge for resolved items */}
                  {item.status !== 'pending' && (
                    <div className="text-xs text-muted-foreground">
                      الحالة:{' '}
                      <span className="font-medium">
                        {item.status === 'approved' ? '✅ موافق عليه' :
                         item.status === 'removed' ? '🗑️ محذوف' :
                         item.status === 'warned' ? '⚠️ مُحذَّر' : item.status}
                      </span>
                      {item.reviewedAt && (
                        <span> · {new Date(item.reviewedAt).toLocaleDateString('ar')}</span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bots tab — Egyptian bot users management */}
      {tab === 'bots' && (
        <div className="space-y-4">
          {/* Status message */}
          {botStatus && (
            <Card className="p-3 rounded-2xl bg-primary/5 border-primary/20">
              <p className="text-sm text-primary">{botStatus}</p>
            </Card>
          )}

          {/* Seed bots */}
          <Card className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <span>👥</span>
                  إنشاء بوتات مصريين
                </h3>
                <p className="text-xs text-muted-foreground">
                  بوتات بأسماء وبايو وبوستات مصرية حقيقية. ينشئوا 100 بوت (50 ذكر، 50 أنثى).
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => seedBots(100)}
                disabled={seeding}
                className="flex-1 gap-2"
              >
                {seeding ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    جاري...
                  </>
                ) : (
                  'إنشاء 100 بوت'
                )}
              </Button>
              <Button
                onClick={fixAvatars}
                disabled={seeding}
                variant="outline"
                className="gap-2"
                title="تحديث صور البروفايل"
              >
                🖼️ صور
              </Button>
              <Button
                onClick={connectBots}
                disabled={seeding}
                variant="outline"
                className="gap-2"
                title="ربط البوتات ببعض (متابعة + صداقة)"
              >
                🔗 ربط
              </Button>
              <Button
                onClick={cleanupBots}
                disabled={seeding}
                variant="outline"
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                title="مسح كل المحتوى القديم"
              >
                🗑️ مسح
              </Button>
            </div>
          </Card>

          {/* Activate bots */}
          <Card className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="mb-3">
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                <span>⚡</span>
                تفعيل نشاط البوتات
              </h3>
              <p className="text-xs text-muted-foreground">
                البوتات هتنشر بوستات، تعمل لايك، وتعلّق بشكل عشوائي. زي الناس الحقيقيين.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => activateBots(5)}
                disabled={activating}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                ⚡ 5 إجراءات
              </Button>
              <Button
                onClick={() => activateBots(15)}
                disabled={activating}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                ⚡ 15 إجراء
              </Button>
              <Button
                onClick={() => activateBots(30)}
                disabled={activating}
                size="sm"
                className="gap-1"
              >
                {activating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    جاري...
                  </>
                ) : (
                  '🚀 30 إجراء'
                )}
              </Button>
            </div>
          </Card>

          {/* Info card */}
          <Card className="p-4 rounded-2xl border-dashed">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span>ℹ️</span>
              إزاي تستخدم البوتات
            </h3>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>اضغط "إنشاء 100 بوت" — ينشئ 100 مستخدم مصري بأسماء وبايو حقيقية</li>
              <li>اضغط "تفعيل" — البوتات تبدأ تنشر وتعلق وتعمل لايك بشكل عشوائي</li>
              <li>كل ضغطة بتكون زي 5-30 إجراء عشوائي (بوست/لايك/تعليق)</li>
              <li>البوتات بتستخدم لهجة مصرية حقيقية في البوستات والتعليقات</li>
              <li>تقدر تكرر التفعيل كل شوية عشان البوتات تفضل نشيطة</li>
            </ol>
          </Card>

          {/* Bot stats */}
          {stats && (
            <Card className="p-4 rounded-2xl">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold tabular-nums text-primary">{stats.users}</div>
                  <div className="text-[11px] text-muted-foreground">إجمالي المستخدمين</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums text-emerald-500">{stats.voiceNotes}</div>
                  <div className="text-[11px] text-muted-foreground">إجمالي الأصوات</div>
                </div>
              </div>
            </Card>
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
