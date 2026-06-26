'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

// Google Client ID — embedded at build time
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

declare global {
  interface Window {
    google?: any
  }
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function GoogleLoginButton({ onSuccess }: { onSuccess: (credential: string) => void }) {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const onSuccessRef = useRef(onSuccess)

  // Keep onSuccess ref updated without re-running the GIS init
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setUseFallback(true)
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    function initGoogle() {
      if (cancelled || initialized.current) return
      if (!window.google?.accounts?.id) return
      initialized.current = true
      setScriptLoaded(true)

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            setLoading(false)
            if (response.credential) {
              onSuccessRef.current(response.credential)
            }
          },
          // Use popup UX mode (more reliable than redirect on mobile)
          ux_mode: 'popup',
          cancel_on_tap_outside: false,
        })

        // Render the official Google button
        if (buttonRef.current) {
          buttonRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            locale: 'ar',
            width: 360,
          })
        }
      } catch (e) {
        console.error('GIS init error:', e)
        setUseFallback(true)
      }
    }

    // Already loaded
    if (window.google?.accounts?.id) {
      initGoogle()
      return
    }

    // Check if script already exists
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', initGoogle)
      timeoutId = setTimeout(() => {
        if (!initialized.current) {
          console.warn('GIS script timeout, falling back to custom button')
          setUseFallback(true)
        }
      }, 5000)
      return
    }

    // Load script fresh
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initGoogle
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script')
      setUseFallback(true)
    }
    document.head.appendChild(script)

    // Fallback timeout
    timeoutId = setTimeout(() => {
      if (!initialized.current) {
        console.warn('GIS script timeout, falling back to custom button')
        setUseFallback(true)
      }
    }, 5000)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Trigger One Tap manually (for fallback button)
  const triggerOneTap = () => {
    if (window.google?.accounts?.id) {
      setLoading(true)
      try {
        window.google.accounts.id.prompt()
      } catch (e) {
        console.error('prompt error:', e)
        setLoading(false)
      }
    } else {
      console.warn('Google Identity Services not loaded yet')
    }
  }

  // Fallback: when no Client ID configured
  if (!GOOGLE_CLIENT_ID) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 h-11"
        disabled
        title="NEXT_PUBLIC_GOOGLE_CLIENT_ID env var not set"
      >
        <GoogleIcon />
        متاح قريباً
      </Button>
    )
  }

  // Fallback: custom-styled button (used if GIS fails to load or render)
  if (useFallback) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 h-11 bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
        onClick={triggerOneTap}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
        متابعة بحساب Google
      </Button>
    )
  }

  return (
    <div className="w-full space-y-2">
      {/* Container for Google's official button */}
      <div
        ref={buttonRef}
        className="flex justify-center items-center"
        style={{ minHeight: 44 }}
      />

      {/* Loading state while GIS script loads */}
      {!scriptLoaded && !loading && (
        <div className="flex items-center justify-center gap-2 h-11 w-full border border-input rounded-full text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري تحميل Google...
        </div>
      )}

      {/* Loading indicator when waiting for Google response */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري...
        </div>
      )}
    </div>
  )
}
