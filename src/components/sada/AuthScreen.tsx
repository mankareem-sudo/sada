'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Mic, Sparkles, Shield, Users } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'

type Mode = 'login' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const setUser = useSada((s) => s.setUser)
  const setAuthLoading = useSada((s) => s.setAuthLoading)
  const stats = useSada((s) => s.stats)
  const setStats = useSada((s) => s.setStats)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.users === 'number') {
          setStats({ users: d.users, voiceNotes: d.voiceNotes, prompts: d.prompts })
        }
      })
      .catch(() => {})
  }, [setStats])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          username,
          mode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'حصل خطأ')
        return
      }
      setUser(data.user)
      setAuthLoading(false)
      toast.success('أهلاً بيك في صدى 🎙️')
    } catch {
      toast.error('مفيش نتال، حاول مرة تانية')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-xl shadow-primary/20">
              <Mic className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold font-cairo mb-2">صَدى</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              منصة الحوار الصوتي العربي. كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية.
            </p>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <Sparkles className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-[11px] text-muted-foreground">سؤال يومي</div>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <Shield className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-[11px] text-muted-foreground">بلا إساءة</div>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <Users className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-[11px] text-muted-foreground">
                {stats && stats.users > 0 ? `${stats.users} صوت` : 'مجتمع هادئ'}
              </div>
            </div>
          </div>

          {/* Form */}
          <Card className="p-5 sada-glass rounded-2xl">
            <div className="flex gap-2 mb-5 p-1 bg-muted/40 rounded-xl">
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                  mode === 'signup'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                حساب جديد
              </button>
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                  mode === 'login'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                دخول
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">الاسم</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={50}
                      placeholder="الاسم الظاهر"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="username">اسم المستخدم</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="[a-zA-Z0-9_]+"
                      placeholder="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      dir="ltr"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  dir="ltr"
                />
                {mode === 'signup' && (
                  <p className="text-[11px] text-muted-foreground">
                    ملاحظة: هذه نسخة تجريبية. لحماية كاملة استخدم كلمة مرور قوية وفريدة.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={loading}
              >
                {loading
                  ? 'جاري...'
                  : mode === 'signup'
                  ? 'إنشاء الحساب'
                  : 'تسجيل الدخول'}
              </Button>
            </form>
          </Card>

          {/* Community promise */}
          <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
            بمشاركتك، بتوافق على الحفاظ على حوار هادئ خالي من السخرية بالأديان أو السياسة أو الإساءات الشخصية.
          </p>
        </div>
      </div>
    </div>
  )
}
