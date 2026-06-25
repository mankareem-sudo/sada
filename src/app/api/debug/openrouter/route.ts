import { NextResponse } from 'next/server'
import { chatCompletion, chatJSON } from '@/lib/openrouter'

/**
 * GET /api/debug/openrouter
 *
 * Debug endpoint to verify OpenRouter API key is set and working.
 * Returns diagnostic info (does NOT expose the actual key).
 */
export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  const diagnostics = {
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  }

  // Try a simple AI call
  try {
    const result = await chatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Reply with exactly: "OK"' },
        { role: 'user', content: 'Say OK' },
      ],
      maxTokens: 10,
      temperature: 0,
    })

    return NextResponse.json({
      ...diagnostics,
      testCall: {
        success: !!result.content,
        content: result.content,
        model: result.model,
        error: result.error,
        usage: result.usage,
      },
    })
  } catch (e: any) {
    return NextResponse.json({
      ...diagnostics,
      testCall: {
        success: false,
        error: e.message,
        stack: e.stack?.split('\n').slice(0, 3).join(' | '),
      },
    })
  }
}

/**
 * POST /api/debug/openrouter
 * body: { prompt }
 *
 * Test a custom prompt.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const prompt = body.prompt || 'اكتب تعليق مصري قصير على هذا المنشور: "الحياة حلوة"'

  const apiKey = process.env.OPENROUTER_API_KEY

  const result = await chatCompletion({
    messages: [
      { role: 'system', content: 'أنت شخص مصري بتكتب تعليق قصير باللهجة المصرية.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 100,
    temperature: 0.8,
  })

  return NextResponse.json({
    apiKeySet: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET',
    prompt,
    result: {
      content: result.content,
      model: result.model,
      error: result.error,
      usage: result.usage,
    },
  })
}
