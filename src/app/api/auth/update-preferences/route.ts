import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * PATCH /api/auth/update-preferences
 * body: { theme?, language? }
 * 
 * Updates user preferences (theme + language).
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }
  
  // Rate limit: 30 per hour per user
  const rateCheck = checkRateLimit(req, 'comment', user.id)
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const body = await req.json()
    const { theme, language } = body as {
      theme?: string
      language?: string
    }
    
    const data: any = {}
    
    if (theme && ['dark', 'light'].includes(theme)) {
      data.theme = theme
    }
    
    if (language && ['ar', 'en'].includes(language)) {
      data.language = language
    }
    
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'مفيش بيانات للتحديث' }, { status: 400 })
    }
    
    const updated = await db.user.update({
      where: { id: user.id },
      data,
    })
    
    return NextResponse.json({
      ok: true,
      theme: updated.theme,
      language: updated.language,
    })
  } catch (e) {
    console.error('update-preferences error:', e)
    return NextResponse.json(
      { error: 'حدث خطأ، حاول مرة تانية' },
      { status: 500 }
    )
  }
}
