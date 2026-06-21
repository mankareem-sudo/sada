import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  setSessionCookie,
  validateUsername,
  sanitizeUsername,
} from '@/lib/auth'
import { ensureSeedPrompts } from '@/lib/prompts'

const AVATAR_COLORS = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#3b82f6', '#a855f7', '#14b8a6',
  '#f97316', '#6366f1',
]

function pickColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, username, mode } = body as {
      email?: string
      password?: string
      name?: string
      username?: string
      mode?: 'login' | 'signup'
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (mode === 'signup') {
      if (!name || !username) {
        return NextResponse.json(
          { error: 'الاسم واسم المستخدم مطلوبان' },
          { status: 400 }
        )
      }
      const cleanUsername = sanitizeUsername(username)
      if (!validateUsername(cleanUsername)) {
        return NextResponse.json(
          { error: 'اسم المستخدم لازم يكون 3-20 حرف أو رقم أو _' },
          { status: 400 }
        )
      }
      const existing = await db.user.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { username: cleanUsername }],
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل' },
          { status: 400 }
        )
      }
      const user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          username: cleanUsername,
          avatarColor: pickColor(cleanUsername),
        },
      })
      const token = await createSession(user.id)
      await setSessionCookie(token)
      await ensureSeedPrompts()
      return NextResponse.json({ user: safeUser(user) })
    } else {
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
      })
      if (!user) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني غير مسجل' },
          { status: 400 }
        )
      }
      const token = await createSession(user.id)
      await setSessionCookie(token)
      await ensureSeedPrompts()
      return NextResponse.json({ user: safeUser(user) })
    }
  } catch (e) {
    console.error('auth error', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}

function safeUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    bio: u.bio,
    avatarColor: u.avatarColor,
    isAdmin: u.isAdmin,
  }
}
