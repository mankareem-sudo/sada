import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/logger'

/**
 * GET /api/debug/openrouter
 *
 * Debug endpoint with verbose error logging.
 */
export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  const diagnostics = {
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  }

  // Try a direct fetch to OpenRouter with verbose logging
  try {
    const body = {
      model: 'google/gemma-4-31b-it:free',
      messages: [
        { role: 'user', content: 'Say OK' },
      ],
      max_tokens: 10,
    }

    console.log('[DEBUG] Sending request to OpenRouter:', JSON.stringify(body))

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': getAppUrl(),
        'X-Title': 'Sada',
      },
      body: JSON.stringify(body),
    })

    const resText = await res.text()
    console.log('[DEBUG] Response status:', res.status)
    console.log('[DEBUG] Response body:', resText.slice(0, 500))

    let data: any = null
    try {
      data = JSON.parse(resText)
    } catch {}

    return NextResponse.json({
      ...diagnostics,
      testCall: {
        success: res.ok && !!data?.choices?.[0]?.message?.content,
        httpStatus: res.status,
        content: data?.choices?.[0]?.message?.content || '',
        model: data?.model || '',
        error: data?.error?.message || (!res.ok ? `HTTP ${res.status}` : ''),
        rawResponse: resText.slice(0, 300),
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
