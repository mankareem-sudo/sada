'use client'

import { useState } from 'react'
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
import { Settings, LogOut, Trash2, Save, Heart, Info } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'

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

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل الحفظ')
        return
      }
      if (user) setUser({ ...user, name: data.user.name, bio: data.user.bio })
      toast.success('تم حفظ التغييرات')
      onOpenChange(false)
    } catch {
      toast.error('فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    onOpenChange(false)
    toast.success('خرجت من حسابك')
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('اكتب DELETE للتأكيد')
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
        toast.error(d.error || 'فشل الحذف')
        return
      }
      setUser(null)
      onOpenChange(false)
      toast.success('تم حذف حسابك. نشوفك قريب 🙏')
    } catch {
      toast.error('فشل الحذف')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <DialogTitle>الإعدادات</DialogTitle>
            </div>
            <DialogDescription>
              تعديل حسابك وإدارة خصوصيتك
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">الاسم</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-bio">النبذة</Label>
              <Textarea
                id="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                className="resize-none"
                placeholder="اكتب نبذة قصيرة عنك..."
              />
              <div className="text-[11px] text-muted-foreground text-left">
                {bio.length}/200
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input value={user?.email || ''} disabled dir="ltr" />
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>

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
                ادعم صدى
              </Button>

              <Button
                variant="outline"
                onClick={logout}
                className="w-full gap-2"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>

              <Button
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                حذف الحساب نهائياً
              </Button>
            </div>

            <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1 pt-1">
              <Info className="h-3 w-3" />
              صدى · الإصدار 1.0
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحساب نهائياً؟</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  هذا الإجراء لا يمكن التراجع عنه. سيتم حذف:
                </p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  <li>كل تسجيلاتك الصوتية</li>
                  <li>كل تعليقاتك وإعجاباتك</li>
                  <li>متابعيك ومتابَعيك</li>
                  <li>بيانات حسابك الشخصية</li>
                </ul>
                <p className="pt-2 font-medium text-destructive">
                  للتأكيد، اكتب <code className="bg-muted px-1 rounded">DELETE</code>:
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
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              disabled={deleting || deleteConfirm !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'جاري الحذف...' : 'حذف نهائي'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
