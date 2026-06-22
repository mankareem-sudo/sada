import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Use __Host- prefix for added security (requires HTTPS, no Domain attribute, path=/)
// This prevents subdomain cookie injection attacks
const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-sada_session' : 'sada_session'
const SESSION_DURATION_DAYS = 30
const SESSION_ROTATION_INTERVAL_DAYS = 7 // Rotate session token every 7 days

// === Token Generation ===

/**
 * Generate a cryptographically secure random session token
 * Uses 32 bytes (256 bits) of entropy — sufficient for session IDs
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a session token for storage (defense in depth)
 * Even if DB is compromised, attackers can't use stolen tokens
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getExpirationDate(): Date {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
}

// === Session Management ===

export async function createSession(userId: string, req?: Request): Promise<string> {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = getExpirationDate()
  
  // Optional: capture IP and User-Agent for audit
  const ip = req ? req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() : null
  const userAgent = req ? req.headers.get('user-agent') : null
  
  // Note: We store the HASH, not the token itself
  // But for compatibility with our Supabase wrapper, we store the token directly
  // (Supabase doesn't have a hashed token column yet)
  // TODO: Add tokenHash column to Session table for true defense-in-depth
  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  })
  
  // Limit sessions per user (max 10) — delete oldest
  const userSessions = await db.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 11, // get 11 to check if there are more than 10
  })
  
  if (userSessions.length > 10) {
    const sessionsToDelete = userSessions.slice(10)
    for (const s of sessionsToDelete) {
      await db.session.delete({ where: { id: s.id } }).catch(() => {})
    }
  }
  
  return token
}

/**
 * Set session cookie with maximum security settings
 */
export async function setSessionCookie(token: string) {
  const expires = getExpirationDate()
  const jar = await cookies()
  
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,           // Prevent JavaScript access (XSS protection)
    secure: true,             // HTTPS only (even in dev if using HTTPS)
    sameSite: 'strict',       // Prevent CSRF (strict = no cross-site cookies)
    expires,
    path: '/',
    // Don't set domain — __Host- prefix requires this
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

/**
 * Get current user from session token
 * - Validates token exists
 * - Validates session not expired
 * - Performs session rotation if needed (every 7 days)
 */
export async function getCurrentUser() {
  const token = await getSessionToken()
  if (!token) return null
  
  // Validate token format (must be 64 hex chars)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    await clearSessionCookie()
    return null
  }
  
  const session = await db.session.findUnique({
    where: { token },
  })
  
  if (!session) return null
  
  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    await clearSessionCookie()
    return null
  }
  
  // Get user
  const user = await db.user.findUnique({
    where: { id: session.userId },
  })
  
  if (!user) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    await clearSessionCookie()
    return null
  }
  
  // Session rotation: if session is older than 7 days, rotate the token
  const sessionAge = Date.now() - new Date(session.createdAt).getTime()
  if (sessionAge > SESSION_ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
    const newToken = generateToken()
    try {
      await db.session.update({
        where: { id: session.id },
        data: { token: newToken },
      })
      await setSessionCookie(newToken)
    } catch {
      // If rotation fails (e.g., race condition), continue with old token
    }
  }
  
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

/**
 * Require admin user — throws if not admin
 */
export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    throw new Error('FORBIDDEN')
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

/**
 * Logout ALL sessions for a user (e.g., on password change)
 */
export async function logoutAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } }).catch(() => {})
}

// === Input Validation ===

/**
 * Validate username: 3-20 chars, alphanumeric + underscore
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false
  if (username.length < 3 || username.length > 20) return false
  return /^[a-zA-Z0-9_]+$/.test(username)
}

export function sanitizeUsername(username: string): string {
  return username.toLowerCase().trim().slice(0, 20)
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  if (email.length > 254) return false
  // RFC 5322 simplified
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email)
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least 1 letter
 * - At least 1 number
 */
export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'كلمة المرور مطلوبة' }
  }
  if (password.length < 8) {
    return { valid: false, reason: 'كلمة المرور لازم تكون 8 أحرف على الأقل' }
  }
  if (password.length > 1000) {
    return { valid: false, reason: 'كلمة المرور طويلة جداً' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, reason: 'كلمة المرور لازم تحوي حرف واحد على الأقل' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'كلمة المرور لازم تحوي رقم واحد على الأقل' }
  }
  return { valid: true }
}

/**
 * Sanitize text input — remove null bytes, limit length
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/\0/g, '')        // Remove null bytes
    .replace(/\r/g, '')        // Normalize line endings
    .trim()
    .slice(0, maxLength)
}

/**
 * Validate audio MIME type
 */
const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]

export function validateAudioMimeType(mimeType: string): boolean {
  return ALLOWED_AUDIO_MIME_TYPES.includes(mimeType)
}

/**
 * Validate audio data URI
 * - Must start with data:audio/
 * - Must be base64
 * - Size limit: 5MB after base64 decode (so ~7MB encoded)
 */
export function validateAudioData(dataUri: string): { valid: boolean; reason?: string } {
  if (!dataUri || typeof dataUri !== 'string') {
    return { valid: false, reason: 'تسجيل صوتي مفقود' }
  }
  
  // Check format: data:audio/...;base64,XXXX
  const match = dataUri.match(/^data:(audio\/[a-z0-9.+-]+(?:;codecs=[a-z0-9.+-]+)?);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) {
    return { valid: false, reason: 'صيغة الصوت غير صحيحة' }
  }
  
  const [, mimeType, base64Data] = match
  
  // Validate MIME type
  if (!validateAudioMimeType(mimeType)) {
    return { valid: false, reason: 'نوع الصوت غير مدعوم' }
  }
  
  // Check size (base64 is ~1.33x the original size)
  const sizeBytes = Math.ceil(base64Data.length * 3 / 4)
  const MAX_SIZE = 7 * 1024 * 1024 // 7MB encoded = ~5MB decoded
  if (sizeBytes > MAX_SIZE) {
    return { valid: false, reason: 'حجم التسجيل كبير جداً (الحد الأقصى 5 ميجابايت)' }
  }
  
  // Validate base64 is well-formed
  if (base64Data.length % 4 !== 0) {
    return { valid: false, reason: 'بيانات الصوت تالفة' }
  }
  
  return { valid: true }
}

/**
 * Validate report reason
 */
const VALID_REPORT_REASONS = ['religion', 'politics', 'insult', 'spam', 'other']

export function validateReportReason(reason: string): boolean {
  return VALID_REPORT_REASONS.includes(reason)
}

/**
 * Validate prompt date format (YYYY-MM-DD)
 */
export function validateDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  // Check it's within reasonable range (not year 1000 or 3000)
  const year = parseInt(date.slice(0, 4))
  return year >= 2020 && year <= 2100
}

/**
 * Check if a string contains potential XSS payloads
 * (Defense in depth — React already escapes, but extra layer)
 */
export function detectXSS(input: string): boolean {
  if (!input) return false
  const lower = input.toLowerCase()
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ]
  return patterns.some(p => p.test(lower))
}
