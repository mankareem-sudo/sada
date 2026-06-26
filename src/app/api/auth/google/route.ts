import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import {
  createSession,
  setSessionCookie,
} from '@/lib/auth'
import { ensureSeedPrompts } from '@/lib/prompts'

/**
 * POST /api/auth/google
 * body: { credential (Google ID Token) }
 * 
 * Verifies Google ID token via Google's tokeninfo endpoint.
 * Creates or logs in user.
 * Email is auto-verified (Google verified it).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { credential } = body as { credential?: string }

    if (!credential) {
      return NextResponse.json({ error: 'missing credential' }, { status: 400 })
    }

    // Verify Google ID token
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    )

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Google token غير صالح' }, { status: 401 })
    }

    const googleData = await verifyRes.json()
    const email = googleData.email?.toLowerCase().trim()
    const name = googleData.name || 'مستخدم صدى'
    const googlePicture = googleData.picture || null
    const googleSub = googleData.sub

    if (!email || !googleSub) {
      return NextResponse.json({ error: 'بيانات Google غير مكتملة' }, { status: 400 })
    }

    // Check if user exists
    let user = await db.user.findUnique({ where: { email } })

    if (user) {
      const token = await createSession(user.id, req)
      await setSessionCookie(token)
      return NextResponse.json({ user: safeUser(user) })
    }

    // Create new user
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15)
    let username = baseUsername || `user${Math.floor(Math.random() * 99999)}`
    let suffix = 0
    while (await db.user.findUnique({ where: { username } })) {
      suffix++
      username = `${baseUsername}${suffix}`
    }

    const AVATAR_COLORS = ['#1763CC', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#3B82F6', '#14b8a6']
    
    user = await db.user.create({
      data: {
        id: generateId(),
        email,
        name,
        username,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        avatarUrl: googlePicture,
        emailVerified: true,
        passwordHash: null,
        onboarded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    const token = await createSession(user.id, req)
    await setSessionCookie(token)
    await ensureSeedPrompts()

    return NextResponse.json({ user: safeUser(user), needsOnboarding: true })
  } catch (e) {
    console.error('Google auth error', e)
    return NextResponse.json({ error: 'فشل تسجيل الدخول بـ Google' }, { status: 500 })
  }
}

function safeUser(u: any) {
  return {
    id: u.id, email: u.email, username: u.username, name: u.name,
    bio: u.bio, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin, onboarded: u.onboarded, emailVerified: u.emailVerified,
    theme: u.theme || 'dark', language: u.language || 'ar',
  }
}
