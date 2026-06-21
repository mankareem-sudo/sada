import { NextResponse } from 'next/server'
import { getTodayPrompt, ensureSeedPrompts } from '@/lib/prompts'

export async function GET() {
  await ensureSeedPrompts()
  const prompt = await getTodayPrompt()
  if (!prompt) {
    return NextResponse.json({ prompt: null })
  }
  return NextResponse.json({
    prompt: {
      id: prompt.id,
      text: prompt.text,
      date: prompt.date,
    },
  })
}
