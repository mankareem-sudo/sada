'use client'

import { useEffect } from 'react'
import { useSada } from '@/lib/store'

/**
 * Push Notification Manager
 * 
 * Handles:
 * 1. Requesting notification permission
 * 2. Subscribing to push notifications
 * 3. Sending subscription to server
 */
export function PushNotificationManager() {
  const user = useSada((s) => s.user)

  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator)) return
    if (!('PushManager' in window)) return

    const setupPush = async () => {
      try {
        // Wait for service worker
        const registration = await navigator.serviceWorker.ready

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          // Get VAPID public key
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!vapidKey) return

          // Subscribe
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          })
        }

        // Send to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys,
          }),
        })

        console.log('[Push] Subscribed successfully')
      } catch (e) {
        console.error('[Push] Subscription failed:', e)
      }
    }

    // Request permission after 5 seconds (don't be pushy)
    const timer = setTimeout(() => {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            setupPush()
          }
        })
      } else if (Notification.permission === 'granted') {
        setupPush()
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [user])

  return null
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}
