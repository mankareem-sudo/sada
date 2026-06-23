'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Mail, Check, Loader2, X } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'

export function EmailVerificationBanner() {
  const user = useSada((s) => s.user)
  const setUser = useSada((s) => s.setUser)
  const [show, setShow] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check if user needs verification (we use onboarded as proxy for verified)
  // Since we don't have an emailVerified column, we check if passwordResetCode exists
  // For simplicity, always show the banner for new users until they verify
  useEffect(() => {
    if (user && !dismissed) {
      // Check localStorage for dismissed state
      const dismissedEmails = JSON.parse(localStorage.getItem('sada-verify-dismissed') || '[]')
      if (!dismissedEmails.includes(user.id)) {
        // Show banner - in production we'd check an emailVerified flag
        // For now, we'll only show it if the user was created in the last 24h
        // We don't have that info client-side, so we'll show it briefly
        const signupTime = localStorage.getItem('sada-signup-time')
        if (signupTime) {
          const elapsed = Date.now() - parseInt(signupTime)
          if (elapsed < 24 * 60 * 60 * 1000) {
            setShow(true)
          }
        }
      }
    }
  }, [user, dismissed])

  const sendCode = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'تم إرسال الكود')
      } else {
        toast.error(data.error || 'فشل')
      }
    } catch { toast.error('فشل') } finally { setLoading(false) }
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error('الكود لازم 6 أرقام')
      return
    }
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('تم تأكيد بريدك الإلكتروني ✅')
        setShow(false)
        localStorage.removeItem('sada-signup-time')
      } else {
        toast.error(data.error || 'كود غير صحيح')
      }
    } catch { toast.error('فشل') } finally { setVerifying(false) }
  }

  const dismiss = () => {
    if (user) {
      const dismissedEmails = JSON.parse(localStorage.getItem('sada-verify-dismissed') || '[]')
      dismissedEmails.push(user.id)
      localStorage.setItem('sada-verify-dismissed', JSON.stringify(dismissedEmails))
    }
    setDismissed(true)
    setShow(false)
  }

  if (!show) return null

  return (
    <Card className="p-4 mb-4 rounded-2xl border-amber-500/30 bg-amber-500/5 sada-fade-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">أكّد بريدك الإلكتروني</h3>
            <button onClick={dismiss} className="p-1 hover:bg-muted/40 rounded-full">
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            ابعنا كود تحقق على {user?.email} عشان نأكد حسابك
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center tracking-[0.3em] font-mono max-w-[140px]"
              dir="ltr"
              maxLength={6}
            />
            <Button size="sm" onClick={verify} disabled={verifying || code.length !== 6} className="gap-1">
              {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              تأكيد
            </Button>
            <Button size="sm" variant="outline" onClick={sendCode} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'إرسال كود'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
