/**
 * Rate Limiter — In-memory rate limiting for Sada API
 * 
 * Uses a sliding window algorithm with in-memory storage.
 * Note: On Vercel serverless, each instance has its own memory,
 * so this is "soft" rate limiting. For strict limiting, use Redis or Vercel KV.
 * 
 * For production with high traffic, replace with @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockedUntil: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now && entry.blockedUntil < now) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000).unref?.()
}

export interface RateLimitConfig {
  // Time window in ms
  windowMs: number
  // Max requests in window
  max: number
  // Block duration after exceeding (ms)
  blockDurationMs?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number // seconds, if blocked
}

/**
 * Check rate limit for a key (e.g., IP + endpoint)
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)
  
  // If blocked, check if block has expired
  if (entry?.blocked && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    }
  }
  
  // Start new window if expired or first request
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs
    store.set(key, {
      count: 1,
      resetTime,
      blocked: false,
      blockedUntil: 0,
    })
    return {
      allowed: true,
      remaining: config.max - 1,
      resetTime,
    }
  }
  
  // Increment count
  entry.count++
  
  // Check if exceeded
  if (entry.count > config.max) {
    const blockDuration = config.blockDurationMs || config.windowMs
    entry.blocked = true
    entry.blockedUntil = now + blockDuration
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil(blockDuration / 1000),
    }
  }
  
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  const headers = new Headers(req.headers)
  // Vercel provides these
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/**
 * Get a unique identifier for rate limiting
 * Combines IP + user ID (if logged in) + endpoint
 */
export function getRateLimitKey(
  req: Request,
  endpoint: string,
  userId?: string
): string {
  const ip = getClientIP(req)
  return userId ? `${endpoint}:${userId}:${ip}` : `${endpoint}:${ip}`
}

// === Predefined rate limit configs ===

export const RATE_LIMITS = {
  // Auth: 5 attempts per 15 minutes per IP (prevents brute force)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5,
    blockDurationMs: 30 * 60 * 1000, // block for 30 min after
  },
  
  // Signup: 3 per hour per IP
  signup: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    blockDurationMs: 2 * 60 * 60 * 1000,
  },
  
  // Voice note creation: 10 per hour per user
  voiceNoteCreate: {
    windowMs: 60 * 60 * 1000,
    max: 10,
  },
  
  // Comments: 30 per hour per user
  comment: {
    windowMs: 60 * 60 * 1000,
    max: 30,
  },
  
  // Likes: 100 per hour per user
  like: {
    windowMs: 60 * 60 * 1000,
    max: 100,
  },
  
  // Reports: 5 per hour per user (prevents report spam)
  report: {
    windowMs: 60 * 60 * 1000,
    max: 5,
  },
  
  // Search: 60 per minute per IP
  search: {
    windowMs: 60 * 1000,
    max: 60,
  },
  
  // Donations: 3 per hour per IP
  donation: {
    windowMs: 60 * 60 * 1000,
    max: 3,
  },
  
  // Transcription (AI cost): 5 per hour per user
  transcribe: {
    windowMs: 60 * 60 * 1000,
    max: 5,
  },
  
  // Admin: 100 per minute per admin
  admin: {
    windowMs: 60 * 1000,
    max: 100,
  },
  
  // Account deletion: 1 per hour per user
  accountDelete: {
    windowMs: 60 * 60 * 1000,
    max: 1,
  },
  
  // Make-admin bootstrap: 3 per hour per IP
  makeAdmin: {
    windowMs: 60 * 60 * 1000,
    max: 3,
  },
} as const

/**
 * Apply rate limit and return appropriate response if blocked
 */
export function checkRateLimit(
  req: Request,
  endpoint: keyof typeof RATE_LIMITS,
  userId?: string
): { allowed: boolean; response?: Response } {
  const config = RATE_LIMITS[endpoint]
  const key = getRateLimitKey(req, endpoint, userId)
  const result = rateLimit(key, config)
  
  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({
        error: 'تم تجاوز الحد المسموح. حاول تاني بعد شوية.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    )
    return { allowed: false, response }
  }
  
  return { allowed: true }
}
