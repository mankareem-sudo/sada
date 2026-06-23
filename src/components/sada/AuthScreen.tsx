'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Mic, Sparkles, Shield, Users, Sun, Moon, Mail, KeyRound, ArrowRight } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { GoogleLoginButton } from './GoogleLoginButton'

type Mode = 'login' | 'signup'
type View = 'auth' | 'forgot' | 'verify' | 'reset'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signup')
  const [view, setView] = useState<View>('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Forgot password state
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Theme + Language
  const theme = useSada((s) => s.theme)
  const setTheme = useSada((s) => s.setTheme)
  const language = useSada((s) => s.language)
  const setLanguage = useSada((s) => s.setLanguage)

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

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sada-theme', newTheme)
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(newTheme)
    }
  }

  // Google login handler
  const handleGoogleLogin = async (credential: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل تسجيل الدخول بـ Google')
        return
      }
      setUser(data.user)
      setAuthLoading(false)
      if (data.needsOnboarding) {
        localStorage.setItem('sada-signup-time', String(Date.now()))
      }
      toast.success(t('auth.welcome', language))
    } catch {
      toast.error(t('error.network', language))
    } finally {
      setLoading(false)
    }
  }

  // Toggle language
  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar'
    setLanguage(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sada-language', newLang)
      document.documentElement.lang = newLang
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    }
  }

  // Submit login/signup
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
      // Set signup time for email verification banner
      if (mode === 'signup') {
        localStorage.setItem('sada-signup-time', String(Date.now()))
      }
      toast.success(t('auth.welcome', language))
    } catch {
      toast.error(t('error.network', language))
    } finally {
      setLoading(false)
    }
  }

  // === Forgot Password Flow ===
  const sendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'حصل خطأ')
        return
      }
      toast.success(t('reset.codeSent', language))
      setView('verify')
    } catch {
      toast.error(t('error.network', language))
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'كود غير صحيح')
        return
      }
      setView('reset')
    } catch {
      toast.error(t('error.network', language))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('reset.passwordMismatch', language))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'حصل خطأ')
        return
      }
      toast.success(t('reset.passwordChanged', language))
      // Reset all and go to login
      setView('auth')
      setMode('login')
      setEmail(resetEmail)
      setPassword('')
      setResetEmail('')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error(t('error.network', language))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Theme + Language toggles (top-right) */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-full bg-card/50 border border-border hover:bg-card transition text-sm font-medium"
          aria-label="Toggle language"
        >
          {language === 'ar' ? 'EN' : 'ع'}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-card/50 border border-border hover:bg-card transition"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3 shadow-xl shadow-primary/20">
              <Mic className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold font-cairo mb-2">{t('app.name', language)}</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              {t('app.description', language)}
            </p>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <Sparkles className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-[11px] text-muted-foreground">{t('today.questionOfDay', language)}</div>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <Shield className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-[11px] text-muted-foreground">{language === 'ar' ? 'بلا إساءة' : 'No abuse'}</div>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/50">
              <Users className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-[11px] text-muted-foreground">
                {stats && stats.users > 0 ? `${stats.users} ${language === 'ar' ? 'صوت' : 'voices'}` : (language === 'ar' ? 'مجتمع هادئ' : 'Calm community')}
              </div>
            </div>
          </div>

          {/* === AUTH VIEW === */}
          {view === 'auth' && (
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
                  {t('auth.signup', language)}
                </button>
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                    mode === 'login'
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('auth.login', language)}
                </button>
              </div>

              {/* Google Login */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <GoogleLoginButton onSuccess={handleGoogleLogin} />

              <form onSubmit={submit} className="space-y-4 mt-4">
                {mode === 'signup' && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">{t('auth.name', language)}</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={50}
                        placeholder={t('auth.name', language)}
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username">{t('auth.username', language)}</Label>
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
                  <Label htmlFor="email">{t('auth.email', language)}</Label>
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
                  <Label htmlFor="password">{t('auth.password', language)}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    dir="ltr"
                  />
                  {mode === 'signup' && (
                    <p className="text-[11px] text-muted-foreground">
                      {language === 'ar'
                        ? 'لازم 8 أحرف على الأقل + حرف + رقم'
                        : 'Min 8 chars + 1 letter + 1 number'}
                    </p>
                  )}
                </div>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {t('auth.forgotPassword', language)}
                  </button>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={loading}
                >
                  {loading
                    ? t('auth.loading', language)
                    : mode === 'signup'
                    ? t('auth.createAccount', language)
                    : t('auth.loginBtn', language)}
                </Button>
              </form>
            </Card>
          )}

          {/* === FORGOT PASSWORD VIEW === */}
          {view === 'forgot' && (
            <Card className="p-5 sada-glass rounded-2xl">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-1">{t('reset.title', language)}</h2>
                <p className="text-xs text-muted-foreground">{t('reset.subtitle', language)}</p>
              </div>
              
              <form onSubmit={sendResetCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resetEmail">{t('auth.email', language)}</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    dir="ltr"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.loading', language) : t('reset.sendCode', language)}
                </Button>
                
                <button
                  type="button"
                  onClick={() => setView('auth')}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  {t('reset.backToLogin', language)}
                </button>
              </form>
            </Card>
          )}

          {/* === VERIFY CODE VIEW === */}
          {view === 'verify' && (
            <Card className="p-5 sada-glass rounded-2xl">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-1">{t('reset.enterCode', language)}</h2>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'بعتنا كود إلى' : 'We sent a code to'} {resetEmail}
                </p>
              </div>
              
              <form onSubmit={verifyCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    dir="ltr"
                    maxLength={6}
                    pattern="\d{6}"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.loading', language) : t('reset.verify', language)}
                </Button>
                
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition"
                >
                  {t('reset.resendCode', language)}
                </button>
              </form>
            </Card>
          )}

          {/* === RESET PASSWORD VIEW === */}
          {view === 'reset' && (
            <Card className="p-5 sada-glass rounded-2xl">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-1">{t('reset.newPassword', language)}</h2>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'اكتب كلمة مرورك الجديدة' : 'Enter your new password'}
                </p>
              </div>
              
              <form onSubmit={resetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">{t('reset.newPassword', language)}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t('reset.confirmPassword', language)}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.loading', language) : t('reset.changePassword', language)}
                </Button>
              </form>
            </Card>
          )}

          {/* Community promise */}
          <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
            {t('auth.communityPromise', language)}
          </p>
        </div>
      </div>
    </div>
  )
}
