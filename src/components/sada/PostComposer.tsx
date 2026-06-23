'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Image as ImageIcon, X, Loader2, Send, Type, Mic, Globe, Users, Lock } from 'lucide-react'
import { useSada } from '@/lib/store'
import { compressPostImage } from '@/lib/image-compress'
import { toast } from 'sonner'

export function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public')
  const fileRef = useRef<HTMLInputElement>(null)
  const user = useSada((s) => s.user)

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجا'); return }
    try {
      const compressed = await compressPostImage(file)
      setImage(compressed)
    } catch { toast.error('فشل') }
  }

  const submit = async () => {
    if (!text.trim() && !image) return
    setLoading(true)
    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: image ? 'image' : 'text',
          content: text.trim() || undefined,
          imageUrl: image || undefined,
          privacy,
        }),
      })
      if (!res.ok) { toast.error('فشل النشر'); return }
      toast.success('تم النشر 🎉')
      setText('')
      setImage(null)
      setOpen(false)
      onPosted?.()
    } catch { toast.error('فشل') } finally { setLoading(false) }
  }

  if (!open) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="p-3 sada-glass rounded-2xl">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-3 text-right text-muted-foreground text-sm hover:text-foreground transition"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Type className="h-4 w-4" />
            </div>
            <span>شارك فكرة، صورة، أو سؤال...</span>
          </button>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="p-4 sada-glass rounded-2xl border-primary/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">منشور جديد</h3>
          <button onClick={() => { setOpen(false); setText(''); setImage(null) }} className="p-1 hover:bg-muted/40 rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="إيه اللي في بالك؟"
          rows={3}
          maxLength={2000}
          className="resize-none bg-transparent border-0 focus-visible:ring-0 text-sm"
          autoFocus
        />

        <AnimatePresence>
          {image && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative mt-3 overflow-hidden rounded-xl"
            >
              <img src={image} alt="Preview" className="w-full max-h-64 object-cover" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 hover:bg-black/80"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            <label className="cursor-pointer p-2 hover:bg-muted/40 rounded-full transition">
              <ImageIcon className="h-5 w-5 text-primary" />
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </label>
            {/* Privacy selector */}
            <div className="flex gap-1 items-center bg-muted/30 rounded-full p-1">
              <button
                onClick={() => setPrivacy('public')}
                className={`p-1.5 rounded-full transition ${privacy === 'public' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                title="عام"
              >
                <Globe className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPrivacy('friends')}
                className={`p-1.5 rounded-full transition ${privacy === 'friends' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                title="الأصدقاء"
              >
                <Users className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPrivacy('private')}
                className={`p-1.5 rounded-full transition ${privacy === 'private' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                title="خاص"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button
            onClick={submit}
            disabled={loading || (!text.trim() && !image)}
            size="sm"
            className="gap-2 rounded-full px-6"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            نشر
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
