'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Settings, LogOut, Trash2, Save, Heart, Info, Sun, Moon, Languages, Camera, KeyRound, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { compressAvatar } from '@/lib/image-compress'

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const user = useSada((s) => s.user)
  const setUser = useSada((s) => s.setUser)
  const setSupportOpen = useSada((s) => s.setSupportOpen)
  const theme = useSada((s) => s.theme)
  const setTheme = useSada((s) => s.setTheme)
  const language = useSada((s) => s.language)
  const setLanguage = useSada((s) => s.setLanguage)

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null)
  const [saving, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  
  // Change password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'الملف لازم يكون صورة' : 'File must be an image')
      return
    }
    
    // Accept up to 10MB, compress automatically
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الصورة كبير جداً (الحد الأقصى 10 ميجا)' : 'Image too large (max 10MB)')
      return
    }
    
    try {
      toast.info(language === 'ar' ? 'جاري ضغط الصورة...' : 'Compressing...')
      const compressed = await compressAvatar(file)
      setAvatarUrl(compressed)
      toast.success(language === 'ar' ? 'تم ضغط الصورة' : 'Image compressed')
    } catch {
      toast.error(language === 'ar' ? 'فشل تحميل الصورة' : 'Failed to load image')
    }
  }

  // Save profile
  const save = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, avatarUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('error.unknown', language))
        return
      }
      if (user) {
        setUser({
          ...user,
          name: data.user.name,
          bio: data.user.bio,
          avatarUrl: data.user.avatarUrl,
        })
      }
      toast.success(t('settings.saved', language))
    } catch {
      toast.error(t('error.unknown', language))
    } finally {
      setLoading(false)
    }
  }

  // Toggle theme
  const toggleTheme = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sada-theme', newTheme)
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(newTheme)
    }
    // Save to server
    fetch('/api/auth/update-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {})
  }

  // Toggle language
  const toggleLanguage = async (newLang: 'ar' | 'en') => {
    setLanguage(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sada-language', newLang)
      document.documentElement.lang = newLang
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    }
    // Save to server
    fetch('/api/auth/update-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLang }),
    }).catch(() => {})
  }

  // Logout
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    onOpenChange(false)
    toast.success(language === 'ar' ? 'خرجت من حسابك' : 'Logged out')
  }

  // Delete account
  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error(language === 'ar' ? 'اكتب DELETE للتأكيد' : 'Type DELETE to confirm')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: deleteConfirm }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || t('error.unknown', language))
        return
      }
      setUser(null)
      onOpenChange(false)
      toast.success(t('delete.deleted', language))
    } catch {
      toast.error(t('error.unknown', language))
    } finally {
      setDeleting(false)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(t('reset.passwordMismatch', language))
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('error.unknown', language))
        return
      }
      toast.success(t('reset.passwordChanged', language))
      setChangePasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch {
      toast.error(t('error.unknown', language))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <DialogTitle>{t('settings.title', language)}</DialogTitle>
            </div>
            <DialogDescription>{t('settings.subtitle', language)}</DialogDescription>
          </DialogHeader>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-border shadow-lg"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${user?.avatarColor || '#8b5cf6'}, ${user?.avatarColor || '#8b5cf6'}cc)` }}
                >
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition"
                aria-label={t('settings.changeAvatar', language)}
              >
                <Camera className="h-4 w-4" />
              </button>
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl(null)}
                  className="absolute top-0 left-0 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition"
                  aria-label={t('settings.removeAvatar', language)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-[11px] text-muted-foreground">
              {language === 'ar' ? 'JPEG, PNG, GIF, WebP — حد أقصى 10 ميجا (بيتضغط تلقائياً)' : 'JPEG, PNG, GIF, WebP — max 10MB (auto-compressed)'}
            </p>
          </div>

          {/* Name + Bio */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">{t('settings.name', language)}</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-bio">{t('settings.bio', language)}</Label>
              <Textarea
                id="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                className="resize-none"
                placeholder={t('settings.bioPlaceholder', language)}
              />
              <div className="text-[11px] text-muted-foreground text-left">
                {bio.length}/200
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('settings.email', language)}</Label>
              <Input value={user?.email || ''} disabled dir="ltr" />
            </div>

            {/* === Appearance === */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t('settings.appearance', language)}
              </Label>
              
              {/* Theme toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition ${
                    theme === 'dark'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:bg-muted/40'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('settings.darkMode', language)}</span>
                </button>
                <button
                  onClick={() => toggleTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition ${
                    theme === 'light'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:bg-muted/40'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('settings.lightMode', language)}</span>
                </button>
              </div>

              {/* Language toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleLanguage('ar')}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition ${
                    language === 'ar'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:bg-muted/40'
                  }`}
                >
                  <Languages className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('settings.arabic', language)}</span>
                </button>
                <button
                  onClick={() => toggleLanguage('en')}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition ${
                    language === 'en'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:bg-muted/40'
                  }`}
                >
                  <Languages className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('settings.english', language)}</span>
                </button>
              </div>
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {saving ? t('settings.saving', language) : t('settings.save', language)}
            </Button>

            {/* Security section */}
            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t('settings.security', language)}
              </Label>
              <Button
                variant="outline"
                onClick={() => setChangePasswordOpen(true)}
                className="w-full gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {t('settings.changePassword', language)}
              </Button>

              {/* Notification settings */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
                </Label>
                {[
                  { key: 'notifLikes', label: language === 'ar' ? 'الإعجابات' : 'Likes' },
                  { key: 'notifComments', label: language === 'ar' ? 'التعليقات' : 'Comments' },
                  { key: 'notifFollows', label: language === 'ar' ? 'المتابعات' : 'Follows' },
                  { key: 'notifMessages', label: language === 'ar' ? 'الرسايل' : 'Messages' },
                  { key: 'notifFriendRequests', label: language === 'ar' ? 'طلبات الصداقة' : 'Friend Requests' },
                ].map((item) => (
                  <NotificationToggle key={item.key} itemKey={item.key} label={item.label} />
                ))}
              </div>

              {/* Account export */}
              <Button
                variant="outline"
                onClick={() => window.open('/api/account/export', '_blank')}
                className="w-full gap-2"
              >
                <Info className="h-4 w-4" />
                {language === 'ar' ? 'تنزيل بياناتي' : 'Export My Data'}
              </Button>
            </div>

            {/* Other actions */}
            <div className="border-t border-border pt-3 space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  setSupportOpen(true)
                }}
                className="w-full gap-2"
              >
                <Heart className="h-4 w-4 text-primary" />
                {t('settings.support', language)}
              </Button>

              <Button
                variant="outline"
                onClick={logout}
                className="w-full gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t('settings.logout', language)}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                {t('settings.deleteAccount', language)}
              </Button>
            </div>

            <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1 pt-1">
              <Info className="h-3 w-3" />
              {t('settings.version', language)} 1.0.0
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              <DialogTitle>{t('settings.changePassword', language)}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('reset.newPassword', language)}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('reset.confirmPassword', language)}</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                dir="ltr"
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              {t('card.cancel', language)}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}
            >
              {changingPassword ? t('auth.loading', language) : t('reset.changePassword', language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title', language)}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{t('delete.warning', language)}</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  <li>{t('delete.item1', language)}</li>
                  <li>{t('delete.item2', language)}</li>
                  <li>{t('delete.item3', language)}</li>
                  <li>{t('delete.item4', language)}</li>
                </ul>
                <p className="pt-2 font-medium text-destructive">
                  {t('delete.confirm', language)} <code className="bg-muted px-1 rounded">DELETE</code>:
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('card.cancel', language)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={deleting || deleteConfirm !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('delete.deleting', language) : t('delete.confirmBtn', language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function NotificationToggle({ itemKey, label }: { itemKey: string; label: string }) {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user && typeof d.user[itemKey] === 'boolean') {
          setEnabled(d.user[itemKey])
        }
      })
      .catch(() => {})
  }, [itemKey])

  const toggle = async (checked: boolean) => {
    setEnabled(checked)
    setLoading(true)
    try {
      await fetch('/api/auth/update-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [itemKey]: checked }),
      })
    } catch {
      setEnabled(!checked)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
      <span className="text-sm">{label}</span>
      <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
    </div>
  )
}
