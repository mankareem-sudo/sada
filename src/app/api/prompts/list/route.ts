import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeedPrompts } from '@/lib/prompts'

export async function GET() {
  await ensureSeedPrompts()
  const prompts = await db.prompt.findMany({
    orderBy: { date: 'desc' },
    take: 30,
    select: {
      id: true,
      text: true,
      date: true,
    },
  })
  return NextResponse.json({ prompts })
}
