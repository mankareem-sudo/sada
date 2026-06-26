import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import {
  generateEgyptianName,
  generateAvatarColor,
  generateEgyptianBio,
  pickRandom,
} from '@/lib/egyptian-bots'

/**
 * Generate a profile picture URL for a bot user.
 * Uses DiceBear API which generates diverse, consistent avatars from a seed.
 *
 * Styles (alternated for variety):
 * - avataaars: cartoon-style diverse avatars
 * - personas: more realistic illustrations
 * - micah: simple face illustrations
 * - lorelei: artistic portraits
 * - notionists: notion-style avatars
 * - open-peeps: hand-drawn style
 */
function generateAvatarUrl(username: string, gender: 'male' | 'female'): string {
  // Alternate between different avatar styles for variety
  const styles = gender === 'male'
    ? ['avataaars', 'personas', 'micah', 'notionists', 'open-peeps']
    : ['avataaars', 'personas', 'lorelei', 'notionists', 'open-peeps']

  const style = pickRandom(styles)
  // Use username as seed for consistency (same user always gets same avatar)
  const seed = encodeURIComponent(username)
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`
}

/**
 * POST /api/bots/seed
 * body: { count?: number }
 *
 * Creates Egyptian bot users with realistic names, bios, and avatars.
 * Default: 100 bots (50 male, 50 female)
 *
 * Bot users are marked with emailVerified=true and a special bio prefix.
 * They don't have passwords (can't login as them).
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin or internal token
    const authHeader = req.headers.get('authorization')
    const internalToken = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'
    if (authHeader !== `Bearer ${internalToken}`) {
      const { getCurrentUser } = await import('@/lib/auth')
      const user = await getCurrentUser()
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const count = Math.min(body.count || 100, 200)

    const created: any[] = []
    const errors: string[] = []

    for (let i = 0; i < count; i++) {
      const gender: 'male' | 'female' = i < count / 2 ? 'male' : 'female'
      const { name, username } = generateEgyptianName(gender)

      try {
        // Check if username already exists
        const existing = await db.user.findUnique({ where: { username } })
        if (existing) {
          // Skip if already exists
          continue
        }

        const email = `bot_${username}@sada-bots.local`
        const emailCheck = await db.user.findUnique({ where: { email } })
        if (emailCheck) continue

        const user = await db.user.create({
          data: {
            id: generateId(),
            email,
            username,
            name,
            bio: generateEgyptianBio(),
            avatarColor: generateAvatarColor(),
            avatarUrl: generateAvatarUrl(username, gender),
            passwordHash: null, // Bots can't login
            emailVerified: true,
            onboarded: true,
            isAdmin: false,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 30 days
            updatedAt: new Date().toISOString(),
          },
        })

        created.push({
          id: user.id,
          username,
          name,
          gender,
        })

        // Small delay to avoid overwhelming the DB
        if (i % 10 === 0) {
          await new Promise((r) => setTimeout(r, 100))
        }
      } catch (e: any) {
        errors.push(`${username}: ${e.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
      bots: created.slice(0, 10), // Show first 10 as sample
    })
  } catch (e) {
    console.error('Bot seed error', e)
    return NextResponse.json({ error: 'فشل إنشاء البوتات' }, { status: 500 })
  }
}
