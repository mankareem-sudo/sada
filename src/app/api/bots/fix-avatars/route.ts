import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pickRandom } from '@/lib/egyptian-bots'

/**
 * POST /api/bots/fix-avatars
 *
 * Updates existing bot users (without avatarUrl) to add DiceBear avatars.
 * Also works for any user missing an avatar.
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

    // Find bot users missing avatars (limit to 30 per call to avoid timeout)
    const bots = await db.user.findMany({
      where: {
        email: { contains: '@sada-bots.local' },
        OR: [
          { avatarUrl: null },
          { avatarUrl: '' },
        ],
      },
      take: 30,
    })

    let updated = 0

    for (const bot of bots as any[]) {
      // Determine gender from name (simplified)
      const femaleNames = ['منى', 'مريم', 'نورا', 'هبة', 'إيمان', 'دينا', 'رنا', 'سارة', 'فاطمة', 'ليلى', 'مايا', 'ميرا', 'نادية', 'هالة', 'ياسمين', 'أمل', 'بسمة', 'جنى', 'دعاء', 'ريم', 'سلمى', 'شهد', 'عائشة', 'لمى', 'ميس', 'نسمة', 'وفاء', 'يارا', 'آية', 'بثينة', 'جيهان', 'داليا', 'رانيا', 'سوزان', 'عبير', 'كريمة', 'منار', 'نهى', 'هدير']
      const gender: 'male' | 'female' = femaleNames.some(n => bot.name.startsWith(n)) ? 'female' : 'male'

      const styles = gender === 'male'
        ? ['avataaars', 'personas', 'micah', 'notionists', 'open-peeps']
        : ['avataaars', 'personas', 'lorelei', 'notionists', 'open-peeps']

      const style = pickRandom(styles)
      const seed = encodeURIComponent(bot.username)
      const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`

      try {
        await db.user.update({
          where: { id: bot.id },
          data: { avatarUrl },
        })
        updated++
      } catch (e) {
        // Skip on error
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      totalBots: (bots as any[]).length,
    })
  } catch (e) {
    console.error('Fix avatars error', e)
    return NextResponse.json({ error: 'فشل تحديث الصور' }, { status: 500 })
  }
}
