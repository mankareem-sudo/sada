import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getAppUrl } from '@/lib/logger'

/**
 * POST /api/make-admin?token=xxx
 * 
 * Bootstrap endpoint to make the FIRST user an admin.
 * Security: Only works if there are NO existing admins.
 *           Also requires a one-time bootstrap token.
 * 
 * After making yourself admin, this endpoint becomes useless.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 attempts per hour per IP
  const rateCheck = checkRateLimit(req, 'makeAdmin')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const expectedToken = 'sada-bootstrap-admin-2026'
  
  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Invalid bootstrap token' },
      { status: 401 }
    )
  }
  
  // Check if any admin already exists
  const existingAdmin = await db.user.findFirst({
    where: { isAdmin: true },
  })
  
  if (existingAdmin) {
    return NextResponse.json(
      { 
        error: 'Admin already exists. Use the admin panel to promote other users.',
        existingAdmin: existingAdmin.email,
      },
      { status: 400 }
    )
  }
  
  // Get the current logged-in user
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'You must be logged in first. Sign up/login, then call this endpoint.' },
      { status: 401 }
    )
  }
  
  // Promote to admin
  const updated = await db.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  })
  
  return NextResponse.json({
    success: true,
    message: `🎉 ${updated.name} is now an admin!`,
    user: {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      email: updated.email,
      isAdmin: updated.isAdmin,
    },
    nextStep: 'Refresh the app. You will see a new "إدارة" (Admin) tab in the bottom navigation.',
  })
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/make-admin',
    method: 'POST',
    usage: 'POST /api/make-admin?token=sada-bootstrap-admin-2026',
    description: 'Promotes the current logged-in user to admin. Only works if no admin exists yet.',
    steps: [
      `1. Sign up / log in to Sada at ${getAppUrl()}`,
      '2. Open this URL in the same browser: /api/make-admin?token=sada-bootstrap-admin-2026',
      '3. Refresh the app — a new "إدارة" tab will appear in the bottom nav',
    ],
  })
}
