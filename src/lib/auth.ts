import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'sada_session'
const SESSION_DURATION_DAYS = 30

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function getExpirationDate(): Date {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  await db.session.create({
    data: {
      token,
      userId,
      expiresAt: getExpirationDate(),
    },
  })
  return token
}

export async function setSessionCookie(token: string) {
  const expires = getExpirationDate()
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value
}

export async function getCurrentUser() {
  const token = await getSessionToken()
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return session.user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function logout() {
  const token = await getSessionToken()
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  await clearSessionCookie()
}

// Username validation: 3-20 chars, alphanumeric + underscore
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username)
}

export function sanitizeUsername(username: string): string {
  return username.toLowerCase().trim()
}
