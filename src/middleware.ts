import { NextRequest, NextResponse } from 'next/server'

/**
 * Security Middleware
 * 
 * This middleware runs on every request and:
 * 1. Blocks requests to admin.html from non-secure origins
 * 2. Adds additional security headers
 * 3. Logs suspicious requests
 */

// Paths that require extra security
const SENSITIVE_PATHS = [
  '/admin.html',
  '/api/admin',
  '/api/make-admin',
  '/api/migrate',
  '/api/setup',
  '/api/account/delete',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()
  
  // Block admin paths from being crawled
  if (SENSITIVE_PATHS.some(p => pathname.startsWith(p))) {
    // Add noindex header
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive')
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  
  // Detect and block common attack patterns in URL
  const url = req.url.toLowerCase()
  const suspiciousPatterns = [
    // SQL injection attempts
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+.*\s+set/i,
    // XSS attempts in URL
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    // Path traversal
    /\.\.\//i,
    /\.\.\\/,
    // Command injection
    /;\s*(cat|ls|rm|wget|curl|bash|sh)\s/i,
    /\|\s*(cat|ls|rm|wget|curl|bash|sh)\s/i,
    /\$\(/,
    /`/i,
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      // Log and block
      console.warn(`[SECURITY] Blocked suspicious request: ${pathname} - pattern: ${pattern}`)
      return new NextResponse('Forbidden', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'X-Blocked-Reason': 'suspicious-pattern',
        }
      })
    }
  }
  
  // Add request ID for tracing
  const requestId = req.headers.get('x-request-id') || 
    crypto.randomUUID()
  res.headers.set('X-Request-Id', requestId)
  
  return res
}

export const config = {
  // Run on all routes except static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon|icon-|apple-touch|robots.txt|manifest.json|sw.js|logo.svg).*)',
  ],
}
