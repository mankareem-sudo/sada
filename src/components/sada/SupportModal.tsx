'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Heart, Coffee, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useSada } from '@/lib/store'

const PRESET_AMOUNTS = [2, 5, 10, 25]

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'دولار' },
  { code: 'EGP', symbol: 'ج.م', label: 'جنيه مصري' },
  { code: 'SAR', symbol: 'ر.س', label: 'ريال سعودي' },
  { code: 'AED', symbol: 'د.إ', label: 'درهم إماراتي' },
]

// Replace these with your actual donation links later
const DONATION_LINKS = [
  {
    id: 'kofi',
    name: 'Ko-fi',
    description: 'دعم سريع بأي مبلغ',
    icon: Coffee,
    url: 'https://ko-fi.com/sada',
    color: 'bg-amber-500 hover:bg-amber-600',
  },
  {
    id: 'buymeacoffee',
    name: 'Buy Me a Coffee',
    description: 'اشتري لي قهوة',
    icon: Coffee,
    url: 'https://buymeacoffee.com/sada',
    color: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'تبرع عبر PayPal',
    icon: ExternalLink,
    url: 'https://paypal.me/sada',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
]

export function SupportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(5)
  const [currency, setCurrency] = useState('USD')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState<{ totalAmount: number; count: number } | null>(null)
  const user = useSada((s) => s.user)

  useEffect(() => {
    if (open && !stats) {
      fetch('/api/donations')
        .then((r) => r.json())
        .then((d) => setStats({ totalAmount: d.totalAmount || 0, count: d.count || 0 }))
        .catch(() => {})
    }
    if (open && user && !name) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [open, stats, user, name])

  const recordAndOpen = async (link: typeof DONATION_LINKS[0]) => {
    setSubmitting(true)
    try {
      await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'مجهول',
          email: email || undefined,
          amount,
          method: link.id,
          message: message || undefined,
        }),
      })
      window.open(link.url, '_blank', 'noopener,noreferrer')
      toast.success(`شكراً لك! هتفتح صفحة ${link.name}`)
      onOpenChange(false)
    } catch {
      toast.error('فشل تسجيل الدعم')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-2">
            <Heart className="h-6 w-6 text-white" fill="currentColor" />
          </div>
          <DialogTitle className="text-center">ادعم تطوير صدى</DialogTitle>
          <DialogDescription className="text-center">
            صدى مجانية وبلا إعلانات. دعمك يساعد في تغطية تكاليف السيرفر والتطوير المستمر.
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        {stats && stats.count > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground">إجمالي دعمكم لصدى</div>
            <div className="text-2xl font-bold text-primary">
              ${stats.totalAmount.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              من {stats.count} داعم 🙏
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="donate-name" className="text-xs">الاسم</Label>
              <Input
                id="donate-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك"
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="donate-email" className="text-xs">البريد (اختياري)</Label>
              <Input
                id="donate-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">المبلغ</Label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`py-2 rounded-lg text-sm font-medium transition border ${
                    amount === a
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  {CURRENCIES.find(c => c.code === currency)?.symbol}{a}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={1000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                dir="ltr"
                className="flex-1"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-card border border-border rounded-lg px-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="donate-msg" className="text-xs">رسالة (اختياري)</Label>
            <Textarea
              id="donate-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="كلمة حلوة لصاحب المشروع 🌟"
              rows={2}
              maxLength={500}
              className="resize-none"
            />
          </div>
        </div>

        {/* Payment methods */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            اختر طريقة الدفع:
          </div>
          {DONATION_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.id}
                onClick={() => recordAndOpen(link)}
                disabled={submitting || amount <= 0}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-white transition disabled:opacity-50 ${link.color}`}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1 text-right">
                  <div className="font-medium">{link.name}</div>
                  <div className="text-xs opacity-90">{link.description}</div>
                </div>
                <div className="font-bold">{CURRENCIES.find(c => c.code === currency)?.symbol}{amount}</div>
              </button>
            )
          })}
        </div>

        {submitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            جاري...
          </div>
        )}

        <div className="text-center text-[11px] text-muted-foreground pt-1">
          <Sparkles className="h-3 w-3 inline-block ml-1" />
          كل دولار بيفرق. شكراً إنك هنا.
        </div>
      </DialogContent>
    </Dialog>
  )
}
