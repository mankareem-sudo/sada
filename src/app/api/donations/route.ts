import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/donations
 * body: { name, email?, amount, currency?, method?, message? }
 * Logs a donation record (manual — actual payment is processed externally via Ko-fi etc).
 */
export async function POST(req: NextRequest) {
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

    if (!name || !name.trim() || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'بيانات غير صحيحة' },
        { status: 400 }
      )
    }

    const donation = await db.supportDonation.create({
      data: {
        userId: user?.id || null,
        name: name.trim().slice(0, 100),
        email: email?.trim().slice(0, 200) || null,
        amount: Math.min(Number(amount), 10000),
        currency: currency || 'USD',
        method: method || 'manual',
        message: message?.trim().slice(0, 500) || null,
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
