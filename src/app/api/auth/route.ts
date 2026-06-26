import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  setSessionCookie,
  validateUsername,
  sanitizeUsername,
  validateEmail,
  validatePassword,
  sanitizeText,
} from '@/lib/auth'
import { ensureSeedPrompts } from '@/lib/prompts'
import { hashPassword, verifyPassword } from '@/lib/password'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendVerificationEmail } from '@/lib/email'

const AVATAR_COLORS = [
  '#1763CC', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#3b82f6', '#3B82F6', '#14b8a6',
  '#f97316', '#6366f1',
]

function pickColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 auth attempts per 15 min per IP
  const rateCheck = checkRateLimit(req, 'auth')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { email, password, name, username, mode } = body as {
      email?: string
      password?: string
      name?: string
      username?: string
      mode?: 'login' | 'signup'
    }

    // Validate inputs
    if (!email || typeof email !== 'string' || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'بريد إلكتروني غير صحيح' },
        { status: 400 }
      )
    }
    
    const passwordCheck = validatePassword(password || '')
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.reason },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim().slice(0, 254)

    if (mode === 'signup') {
      // Additional rate limit for signup
      const signupRateCheck = checkRateLimit(req, 'signup')
      if (!signupRateCheck.allowed && signupRateCheck.response) {
        return signupRateCheck.response
      }
      
      // Validate name
      const cleanName = sanitizeText(name || '', 50)
      if (cleanName.length < 2) {
        return NextResponse.json(
          { error: 'الاسم لازم يكون حرفين على الأقل' },
          { status: 400 }
        )
      }
      
      // Validate username
      const cleanUsername = sanitizeUsername(username || '')
      if (!validateUsername(cleanUsername)) {
        return NextResponse.json(
          { error: 'اسم المستخدم لازم يكون 3-20 حرف أو رقم أو _' },
          { status: 400 }
        )
      }
      
      // Block reserved usernames
      const reservedUsernames = ['admin', 'root', 'api', 'www', 'mail', 'support', 'help', 'sada', 'echo', 'voice']
      if (reservedUsernames.includes(cleanUsername)) {
        return NextResponse.json(
          { error: 'اسم المستخدم محجوز' },
          { status: 400 }
        )
      }
      
      const existing = await db.user.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { username: cleanUsername }],
        },
      })
      if (existing) {
        // Generic error to prevent user enumeration
        return NextResponse.json(
          { error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل' },
          { status: 400 }
        )
      }
      const passwordHash = hashPassword(password!)
      const user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: cleanName,
          username: cleanUsername,
          avatarColor: pickColor(cleanUsername),
          passwordHash,
          emailVerified: false,
        },
      })
      const token = await createSession(user.id, req)
      await setSessionCookie(token)
      await ensureSeedPrompts()
      // Send email verification code IMMEDIATELY
      try {
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString()
        await db.user.update({
          where: { id: user.id },
          data: { passwordResetCode: verifyCode, passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000) },
        })
        sendVerificationEmail(normalizedEmail, verifyCode, cleanName).catch(() => {})
      } catch {}
      return NextResponse.json({ user: safeUser(user), needsEmailVerification: true })
    } else {
      // login — verify password
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
      })
      
      // Always do password verification to prevent timing attacks
      // Even if user doesn't exist, we hash a dummy password and compare
      const dummyHash = '$scrypt$16384$8$1$0000000000000000000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
      const hashToVerify = user?.passwordHash || dummyHash
      
      const ok = verifyPassword(password!, hashToVerify)
      if (!user || !ok) {
        // Generic error to prevent user enumeration
        return NextResponse.json(
          { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
          { status: 400 }
        )
      }
      
      const token = await createSession(user.id, req)
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
    avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin,
    onboarded: u.onboarded,
    interests: u.interests,
    theme: u.theme,
    language: u.language,
    emailVerified: u.emailVerified,
  }
}
