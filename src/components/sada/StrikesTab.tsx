'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Search, AlertTriangle, Ban, VolumeX, CheckCircle2, Gavel } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface StrikeWarning {
  id: string
  reason: string
  category: string
  severity: string
  isAcknowledged: boolean
  createdAt: string
  expiresAt: string | null
}

interface StrikeStatus {
  userId: string
  strikeCount: number
  unacknowledgedCount: number
  currentPenalty: 'none' | 'mute' | 'ban'
  penaltyEndsAt: string | null
  warnings: StrikeWarning[]
}

interface UserSearchResult {
  id: string
  username: string
  name: string
  avatarColor: string
  avatarUrl?: string | null
  email: string
}

export function StrikesTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [strikeStatus, setStrikeStatus] = useState<StrikeStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Strike form
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('admin_strike')
  const [severity, setSeverity] = useState('medium')
  const [applying, setApplying] = useState(false)

  const searchUsers = async () => {
    const q = searchQuery.trim()
    if (!q || q.length < 2) return
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=users&limit=10`)
      const data = await res.json()
      if (data.users) setSearchResults(data.users)
      else if (data.results) setSearchResults(data.results)
    } catch {
      toast.error('فشل البحث')
    } finally { setSearching(false) }
  }

  const loadStrikeStatus = async (user: UserSearchResult) => {
    setSelectedUser(user)
    setLoadingStatus(true)
    setStrikeStatus(null)
    try {
      const res = await fetch(`/api/admin/strike?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setStrikeStatus(data)
      } else {
        toast.error('فشل تحميل حالة العقوبات')
      }
    } catch {
      toast.error('فشل')
    } finally { setLoadingStatus(false) }
  }

  const applyStrike = async () => {
    if (!selectedUser || !reason.trim()) return
    setApplying(true)
    try {
      const res = await fetch('/api/admin/strike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          reason: reason.trim(),
          category,
          severity,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل تطبيق العقوبة')
        return
      }
      toast.success(`تم تطبيق العقوبة: ${data.penaltyLabel}`)
      setReason('')
      // Reload status
      await loadStrikeStatus(selectedUser)
    } catch {
      toast.error('فشل')
    } finally { setApplying(false) }
  }

  return (
    <div className="space-y-4">
      {/* Search section */}
      <Card className="p-4 rounded-2xl">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Gavel className="h-4 w-4 text-primary" />
          تطبيق عقوبة على مستخدم
        </h3>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو اليوزرنيم..."
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="flex-1"
          />
          <Button onClick={searchUsers} disabled={searching || searchQuery.length < 2}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => loadStrikeStatus(u)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg transition text-right',
                  selectedUser?.id === u.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/40'
                )}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: u.avatarColor || '#888' }}
                >
                  {u.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Selected user + strike form */}
      {selectedUser && (
        <Card className="p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: selectedUser.avatarColor || '#888' }}
              >
                {selectedUser.name?.[0] || '?'}
              </div>
              <div>
                <div className="font-medium text-sm">{selectedUser.name}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">@{selectedUser.username}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setStrikeStatus(null) }}>
              ✕
            </Button>
          </div>

          {/* Current status */}
          {loadingStatus ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : strikeStatus ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg p-2">
                  <div className="text-lg font-bold">{strikeStatus.strikeCount}</div>
                  <div className="text-[10px] text-muted-foreground">strikes</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <div className="text-lg font-bold">{strikeStatus.unacknowledgedCount}</div>
                  <div className="text-[10px] text-muted-foreground">غير مُقرّ</div>
                </div>
                <div className={cn(
                  'rounded-lg p-2',
                  strikeStatus.currentPenalty === 'ban' ? 'bg-destructive/10' :
                  strikeStatus.currentPenalty === 'mute' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                )}>
                  <div className="text-lg font-bold flex items-center justify-center">
                    {strikeStatus.currentPenalty === 'ban' ? <Ban className="h-4 w-4 text-destructive" /> :
                     strikeStatus.currentPenalty === 'mute' ? <VolumeX className="h-4 w-4 text-amber-500" /> :
                     <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {strikeStatus.currentPenalty === 'ban' ? 'محظور' :
                     strikeStatus.currentPenalty === 'mute' ? 'مكتوم' : 'سليم'}
                  </div>
                </div>
              </div>

              {strikeStatus.penaltyEndsAt && (
                <p className="text-xs text-center text-muted-foreground">
                  تنتهي العقوبة: {new Date(strikeStatus.penaltyEndsAt).toLocaleString('ar-EG')}
                </p>
              )}

              {/* Recent warnings */}
              {strikeStatus.warnings.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <div className="text-xs font-medium text-muted-foreground pt-2">آخر التحذيرات:</div>
                  {strikeStatus.warnings.slice(0, 5).map((w) => (
                    <div key={w.id} className="text-xs p-2 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{w.category}</span>
                        <span className="text-muted-foreground">{new Date(w.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <p className="text-muted-foreground">{w.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Apply new strike */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-xs font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              تطبيق strike جديد
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب العقوبة (سيظهر للمستخدم)..."
              rows={2}
              maxLength={300}
            />
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs bg-muted/30 rounded px-2 py-1.5 flex-1"
              >
                <option value="admin_strike">إداري</option>
                <option value="spam">سبام</option>
                <option value="harassment">مضايقة</option>
                <option value="hate_speech">خطاب كراهية</option>
                <option value="misinformation">معلومات مضللة</option>
                <option value="policy_violation">مخالفة سياسة</option>
              </select>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="text-xs bg-muted/30 rounded px-2 py-1.5 flex-1"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="critical">حرجة</option>
              </select>
            </div>
            <Button
              onClick={applyStrike}
              disabled={applying || !reason.trim()}
              className="w-full bg-destructive hover:bg-destructive/90 text-white"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              تطبيق العقوبة
            </Button>
          </div>
        </Card>
      )}

      {/* Strike system rules reference */}
      <Card className="p-4 rounded-2xl bg-muted/20">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">قواعد نظام العقوبات</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>1 strike</span><span className="text-muted-foreground">تحذير فقط</span></div>
          <div className="flex justify-between"><span>2 strikes</span><span className="text-amber-500">كتم 24 ساعة</span></div>
          <div className="flex justify-between"><span>3 strikes</span><span className="text-orange-500">حظر 7 أيام</span></div>
          <div className="flex justify-between"><span>4 strikes</span><span className="text-red-500">حظر 30 يوم</span></div>
          <div className="flex justify-between"><span>5+ strikes</span><span className="text-destructive font-bold">حظر دائم</span></div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Strkes تنتهي بعد 90 يوم</p>
      </Card>
    </div>
  )
}
