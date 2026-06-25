/**
 * OpenRouter API Client
 *
 * Free models available (as of 2026):
 * - google/gemini-2.0-flash-exp:free (multilingual, fast)
 * - meta-llama/llama-3.2-3b-instruct:free (small, fast)
 * - qwen/qwen-2.5-7b-instruct:free (good Arabic support)
 * - mistralai/mistral-7b-instruct:free (general purpose)
 * - microsoft/phi-3-mini-128k-instruct:free (small, capable)
 *
 * Features:
 * - Automatic fallback between models
 * - Rate limit handling (429 retry)
 * - Request timeout
 * - Cost tracking (free models = $0)
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Free models in priority order (best first) — updated June 2026
// Verified available via https://openrouter.ai/api/v1/models
export const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',      // 70B, great quality
  'qwen/qwen3-next-80b-a3b-instruct:free',         // 80B, excellent Arabic
  'openai/gpt-oss-120b:free',                      // 120B, OpenAI open model
  'google/gemma-4-31b-it:free',                    // 31B, Google
  'meta-llama/llama-3.2-3b-instruct:free',         // 3B, fast fallback
  'nvidia/nemotron-3-nano-30b-a3b:free',           // 30B, NVIDIA
] as const

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
  /** Skip the API call and return null (for testing) */
  dryRun?: boolean
}

export interface ChatCompletionResult {
  content: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  cost?: number
  error?: string
}

/**
 * Call OpenRouter chat completion API with automatic fallback
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const {
    messages,
    model,
    temperature = 0.3,
    maxTokens = 1000,
    responseFormat = 'text',
    dryRun = false,
  } = options

  if (dryRun) {
    return { content: '', model: 'dry-run' }
  }

  if (!OPENROUTER_API_KEY) {
    return { content: '', model: 'none', error: 'OPENROUTER_API_KEY not set' }
  }

  // Try the specified model first, then fall back to free models
  const modelsToTry = model ? [model, ...FREE_MODELS] : [...FREE_MODELS]

  for (const currentModel of modelsToTry) {
    try {
      const result = await callModel(currentModel, {
        messages,
        temperature,
        maxTokens,
        responseFormat,
      })
      if (result.content) {
        return result
      }
    } catch (e: any) {
      console.warn(`[OpenRouter] Model ${currentModel} failed:`, e.message)
      // Continue to next model
      if (e.status === 429) {
        // Rate limited — wait a bit before trying next
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  return {
    content: '',
    model: 'none',
    error: 'All models failed',
  }
}

async function callModel(
  model: string,
  options: {
    messages: ChatMessage[]
    temperature: number
    maxTokens: number
    responseFormat: 'text' | 'json'
  }
): Promise<ChatCompletionResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const body: any = {
      model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' }
    }

    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://my-project-one-lake-82.vercel.app',
        'X-Title': 'Sada — Arabic Voice Platform',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const error = new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`) as any
      error.status = res.status
      throw error
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    return {
      content,
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
      cost: 0, // Free models
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Quick helper for JSON-only responses (parses the content as JSON)
 */
export async function chatJSON<T = any>(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<{ data: T | null; error?: string; model: string }> {
  const result = await chatCompletion({
    messages: [
      ...messages,
      {
        role: 'system',
        content: 'You must respond with valid JSON only. No markdown, no explanation, just JSON.',
      },
    ],
    responseFormat: 'json',
    temperature: options?.temperature ?? 0.2,
    maxTokens: options?.maxTokens ?? 800,
    model: options?.model,
  })

  if (result.error || !result.content) {
    return { data: null, error: result.error || 'Empty response', model: result.model }
  }

  try {
    // Try to extract JSON from the response (in case model didn't follow instructions perfectly)
    let content = result.content.trim()
    // Remove markdown code fences if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }
    // Find first { and last }
    const firstBrace = content.indexOf('{')
    const lastBrace = content.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      content = content.slice(firstBrace, lastBrace + 1)
    }
    const data = JSON.parse(content) as T
    return { data, model: result.model }
  } catch (e: any) {
    return { data: null, error: `JSON parse error: ${e.message}`, model: result.model }
  }
}
