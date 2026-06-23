'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from './Avatar'
import { VoicePlayer } from './VoicePlayer'
import { ArrowRight, Send, Loader2, MessageSquare, Image as ImageIcon, X } from 'lucide-react'
import { useSada } from '@/lib/store'
import { timeAgo } from '@/lib/format'
import { compressCommentImage } from '@/lib/image-compress'
import { toast } from 'sonner'

interface Conversation {
  partnerId: string
  lastMessage: {
    id: string
    content?: string | null
    imageUrl?: string | null
    voiceData?: string | null
    voiceDuration?: number | null
    senderId: string
    createdAt: string
  }
  unreadCount: number
  partner: {
    id: string
    name: string
    username: string
    avatarColor: string
    avatarUrl?: string | null
  } | null
}

interface Message {
  id: string
  content?: string | null
  imageUrl?: string | null
  voiceData?: string | null
  voiceDuration?: number | null
  senderId: string
  receiverId: string
  read: boolean
  createdAt: string
}

export function MessagesView() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activePartner, setActivePartner] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [commentImage, setCommentImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const user = useSada((s) => s.user)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/messages/list')
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  const loadMessages = useCallback(async (partnerId: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/messages/conversation?partnerId=${partnerId}&limit=100`)
      const data = await res.json()
      setMessages(data.messages || [])
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch {} finally { setLoadingMessages(false) }
  }, [])

  const openConversation = (conv: Conversation) => {
    setActivePartner(conv)
    loadMessages(conv.partnerId)
  }

  const sendMessage = async () => {
    if (!text.trim() && !commentImage) return
    if (!activePartner) return
    setSending(true)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activePartner.partnerId,
          content: text.trim() || undefined,
          imageUrl: commentImage || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'فشل'); return }
      
      setMessages(prev => [...prev, {
        id: data.id,
        content: text.trim() || null,
        imageUrl: commentImage,
        voiceData: null,
        voiceDuration: null,
        senderId: user!.id,
        receiverId: activePartner.partnerId,
        read: false,
        createdAt: data.createdAt,
      }])
      setText('')
      setCommentImage(null)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { toast.error('فشل') } finally { setSending(false) }
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('الحد الأقصى 10 ميجا'); return }
    try {
      const compressed = await compressCommentImage(file)
      setCommentImage(compressed)
    } catch { toast.error('فشل') }
  }

  // === Conversation List View ===
  if (!activePartner) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-4">
        <div>
          <h2 className="font-bold text-lg">الرسايل</h2>
          <p className="text-sm text-muted-foreground">محادثاتك مع أصدقائك</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : conversations.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-dashed">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              مفيش رسايل لسه. ابدأ بمحادثة صديق من بروفايله!
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <motion.div
                key={conv.partnerId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card
                  className="p-3 sada-glass rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition"
                  onClick={() => openConversation(conv)}
                >
                  <Avatar
                    name={conv.partner?.name || '?'}
                    color={conv.partner?.avatarColor || '#888'}
                    imageUrl={conv.partner?.avatarUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{conv.partner?.name}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(conv.lastMessage.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage.content || (conv.lastMessage.imageUrl ? '📷 صورة' : conv.lastMessage.voiceData ? '🎙️ صوت' : '...')}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // === Chat View ===
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border/30 mb-4">
        <button onClick={() => { setActivePartner(null); loadConversations() }} className="p-1 hover:bg-muted/40 rounded-full">
          <ArrowRight className="h-5 w-5" />
        </button>
        <Avatar
          name={activePartner.partner?.name || '?'}
          color={activePartner.partner?.avatarColor || '#888'}
          imageUrl={activePartner.partner?.avatarUrl}
          size="sm"
        />
        <span className="font-medium text-sm">{activePartner.partner?.name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loadingMessages ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">ابدأ المحادثة!</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMine ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                  }`}
                >
                  {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  {msg.imageUrl && <img src={msg.imageUrl} alt="" className="mt-1 max-h-40 rounded-lg" />}
                  {msg.voiceData && (
                    <div className="mt-1">
                      <VoicePlayer src={msg.voiceData} durationSec={msg.voiceDuration || 0} accent={isMine ? 'accent' : 'primary'} />
                    </div>
                  )}
                  <div className={`text-[9px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {timeAgo(msg.createdAt)}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/30 pt-3">
        {commentImage && (
          <div className="relative inline-block mb-2">
            <img src={commentImage} alt="" className="max-h-20 rounded-lg" />
            <button onClick={() => setCommentImage(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <label className="cursor-pointer p-2 hover:bg-muted/40 rounded-full transition shrink-0">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-muted/40 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={sending || (!text.trim() && !commentImage)}
            className="rounded-full h-10 w-10 p-0 shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
