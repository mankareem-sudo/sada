import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeText, validateEmail } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/donations
 * body: { name, email?, amount, currency?, method?, message? }
 * Logs a donation record (manual — actual payment is processed externally via Ko-fi etc).
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 donations per hour per IP
  const rateCheck = checkRateLimit(req, 'donation')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const { name, email, amount, currency, method, message } = body as {
      name?: string
      email?: string
      amount?: number
      currency?: string
      method?: string
      message?: string
    }

    // Validate name
    const cleanName = sanitizeText(name || '', 100)
    if (cleanName.length < 1) {
      return NextResponse.json(
        { error: 'الاسم مطلوب' },
        { status: 400 }
      )
    }
    
    // Validate email if provided
    if (email && !validateEmail(email)) {
      return NextResponse.json(
        { error: 'بريد إلكتروني غير صحيح' },
        { status: 400 }
      )
    }
    
    // Validate amount
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0 || numAmount > 10000) {
      return NextResponse.json(
        { error: 'مبلغ غير صحيح' },
        { status: 400 }
      )
    }
    
    // Validate currency
    const cleanCurrency = (currency || 'USD').slice(0, 3).toUpperCase()
    
    // Validate method
    const validMethods = ['kofi', 'buymeacoffee', 'paypal', 'manual']
    const cleanMethod = validMethods.includes(method || '') ? method! : 'manual'

    const donation = await db.supportDonation.create({
      data: {
        userId: user?.id || null,
        name: cleanName,
        email: email ? email.trim().slice(0, 200).toLowerCase() : null,
        amount: numAmount,
        currency: cleanCurrency,
        method: cleanMethod,
        message: message ? sanitizeText(message, 500) : null,
      },
    })

    return NextResponse.json({ ok: true, id: donation.id })
  } catch (e) {
    console.error('donation error', e)
    return NextResponse.json(
      { error: 'فشل تسجيل الدعم' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/donations
 * Public: returns total donations count + sum (not individual records).
 */
export async function GET() {
  const aggregates = await db.supportDonation.aggregate({
    _sum: { amount: true },
    _count: true,
  })
  return NextResponse.json({
    totalAmount: aggregates._sum.amount || 0,
    count: aggregates._count,
  })
}
