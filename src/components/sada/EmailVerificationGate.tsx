'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Mail, Check, Loader2, X, RefreshCw } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'

export function EmailVerificationGate() {
  const user = useSada((s) => s.user)
  const setUser = useSada((s) => s.setUser)
  const setAuthLoading = useSada((s) => s.setAuthLoading)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [sending, setSending] = useState(false)

  // Don't show if not logged in or already verified
  if (!user || user.emailVerified) return null

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
        setUser({ ...user, emailVerified: true })
        setAuthLoading(false)
      } else {
        toast.error(data.error || 'كود غير صحيح')
      }
    } catch { toast.error('فشل') } finally { setVerifying(false) }
  }

  const resendCode = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'تم إرسال الكود')
      } else {
        toast.error(data.error || 'فشل')
      }
    } catch { toast.error('فشل') } finally { setSending(false) }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    toast.info('خرجت من حسابك')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-background">
      <div className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-xl shadow-primary/20">
            <Mail className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-cairo mb-2">تأكيد البريد الإلكتروني</h1>
          <p className="text-muted-foreground text-sm">
            بعتنا كود تحقق إلى <span className="font-medium text-foreground" dir="ltr">{user.email}</span>
            <br />
            ادخل الكود عشان تكمّل التسجيل
          </p>
        </div>

        <Card className="p-6 sada-glass rounded-2xl">
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="text-center text-3xl tracking-[0.5em] font-mono font-bold h-16"
            dir="ltr"
            maxLength={6}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && verify()}
          />

          <Button
            onClick={verify}
            disabled={verifying || code.length !== 6}
            className="w-full mt-4 gap-2 bg-primary hover:bg-primary/90 h-12 text-base"
          >
            {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            تأكيد
          </Button>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={resendCode}
              disabled={sending}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              إعادة إرسال الكود
            </button>

            <button
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              خروج
            </button>
          </div>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          لو مش وصلك الكود، تأكد من spam/junk folder
          <br />
          الكود صالح لمدة 15 دقيقة
        </p>
      </div>
    </div>
  )
}
