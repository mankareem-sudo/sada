'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Code, Palette, Briefcase, GraduationCap, HeartPulse, Sparkles, Globe, LifeBuoy, Loader2 } from 'lucide-react'
import { useSada } from '@/lib/store'
import { toast } from 'sonner'

const INTERESTS = [
  { id: 'tech', label: 'تقنية وبرمجة', icon: Code, color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { id: 'design', label: 'تصميم وفن', icon: Palette, color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { id: 'business', label: 'ريادة أعمال', icon: Briefcase, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'learning', label: 'تعلم وتطوير', icon: GraduationCap, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'health', label: 'صحة ولياقة', icon: HeartPulse, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'creativity', label: 'كتابة وإبداع', icon: Sparkles, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'culture', label: 'ثقافة وكتب', icon: Globe, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { id: 'life', label: 'تطوير الذات', icon: LifeBuoy, color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
]

export function OnboardingModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const setUser = useSada((s) => s.setUser)
  const user = useSada((s) => s.user)

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const submit = async () => {
    if (selected.length === 0) {
      toast.error('اختار اهتمام واحد على الأقل')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selected }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل')
        return
      }
      if (user) setUser({ ...user, onboarded: true, interests: data.user.interests })
      toast.success('أهلاً بيك في صدى! ابدأ بأول تسجيل 🎙️')
      onOpenChange(false)
    } catch {
      toast.error('فشل')
    } finally {
      setSubmitting(false)
    }
  }

  const skip = () => {
    if (user) setUser({ ...user, onboarded: true })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">أهلاً بيك في صدى 🎙️</DialogTitle>
          <DialogDescription className="text-center">
            عشان نخصص لك التجربة، اختار اهتماماتك (يمكنك تخطي):
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {INTERESTS.map((interest) => {
            const Icon = interest.icon
            const isOn = selected.includes(interest.id)
            return (
              <button
                key={interest.id}
                onClick={() => toggle(interest.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition text-right ${
                  isOn
                    ? interest.color
                    : 'bg-card border-border hover:bg-muted/40'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{interest.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={skip} className="flex-1">
            تخطي
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || selected.length === 0}
            className="flex-1 gap-2 bg-primary hover:bg-primary/90"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            إكمال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
