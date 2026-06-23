'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Cookie } from 'lucide-react'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('sada-cookie-consent')
    if (!accepted) {
      setTimeout(() => setShow(true), 2000)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('sada-cookie-consent', 'accepted')
    setShow(false)
  }

  const decline = () => {
    localStorage.setItem('sada-cookie-consent', 'declined')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 inset-x-0 z-50 px-4 pointer-events-none"
        >
          <Card className="max-w-2xl mx-auto p-4 sada-glass rounded-2xl shadow-2xl pointer-events-auto border-primary/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">الكوكيز والخصوصية</h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  صدى بتستخدم كوكيز أساسية لشغلك (تسجيل الدخول، التفضيلات، الثيم).
                  مابنستخدمش كوكيز للتتبع الإعلاني. بقراءة سياسة الخصوصية بتاعنا انت بتوافق.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={accept} className="gap-1 text-xs">
                    موافق
                  </Button>
                  <Button size="sm" variant="outline" onClick={decline} className="text-xs">
                    رفض
                  </Button>
                  <a href="/privacy" className="text-xs text-primary hover:underline self-center px-2">
                    سياسة الخصوصية
                  </a>
                </div>
              </div>
              <button onClick={decline} className="p-1 hover:bg-muted/40 rounded-full shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
