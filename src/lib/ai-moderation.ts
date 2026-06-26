/**
 * AI-Powered Moderation System for Sada
 *
 * Uses OpenRouter free models to detect:
 * - Hate speech (خطاب كراهية)
 * - Harassment (مضايقة)
 * - Bullying (تنمر)
 * - Insults/Profanity (إهانات/ألفاظ نابية)
 * - Spam (سبام)
 * - Threats (تهديدات)
 * - Explicit content (محتوى صريح)
 * - Personal information (معلومات شخصية)
 *
 * Hybrid approach:
 * 1. Fast keyword filter (moderateText from moderation.ts)
 * 2. AI analysis for nuanced/contextual detection
 *
 * Returns: severity (0-100), categories, action (allow/flag/block/warn)
 */

import { chatJSON } from './openrouter'
import { moderateText } from './moderation'

export interface AIModerationResult {
  isViolation: boolean
  severity: number // 0-100
  categories: ModerationCategory[]
  explanation: string
  action: 'allow' | 'warn' | 'flag' | 'block'
  suggestedAction: string // human-readable
  confidence: number // 0-1
  model: string
  /** Quick keyword filter result (always runs) */
  keywordScore: number
  /** Did AI run? (skipped if keyword score is very low) */
  aiUsed: boolean
}

export type ModerationCategory =
  | 'hate_speech'
  | 'harassment'
  | 'bullying'
  | 'insults'
  | 'profanity'
  | 'spam'
  | 'threats'
  | 'explicit_content'
  | 'personal_info'
  | 'off_topic'
  | 'safe'

const CATEGORY_LABELS_AR: Record<ModerationCategory, string> = {
  hate_speech: 'خطاب كراهية',
  harassment: 'مضايقة',
  bullying: 'تنمر',
  insults: 'إهانات',
  profanity: 'ألفاظ نابية',
  spam: 'سبام',
  threats: 'تهديدات',
  explicit_content: 'محتوى صريح',
  personal_info: 'معلومات شخصية',
  off_topic: 'خارج الموضوع',
  safe: 'آمن',
}

const SYSTEM_PROMPT = `You are an expert content moderator for "Sada" (صدى), an Arabic voice-based social platform focused on calm, respectful dialogue. The platform's core values are:
- No sarcasm (لا سخرية)
- No insults (لا إساءة)
- No hate speech (لا خطاب كراهية)
- Calm, constructive conversations

You analyze Arabic text (Modern Standard Arabic + Egyptian/Levantine/Gulf dialects) and detect policy violations.

Respond with JSON only. Schema:
{
  "is_violation": boolean,
  "severity": number (0-100, 0=safe, 100=critical),
  "categories": ["hate_speech" | "harassment" | "bullying" | "insults" | "profanity" | "spam" | "threats" | "explicit_content" | "personal_info" | "off_topic" | "safe"],
  "explanation": "brief explanation in Arabic of what was detected",
  "suggested_action": "allow" | "warn" | "flag" | "block",
  "confidence": number (0-1)
}

Guidelines:
- "allow": Safe content, no action needed
- "warn": Mild violation (sarcasm, slight rudeness) — show warning to user but allow
- "flag": Moderate violation — publish but flag for admin review
- "block": Severe violation (hate speech, threats, extreme profanity) — block publication

Cultural context:
- Religious discussions are OK if respectful; blasphemy/insulting religions is NOT
- Political opinions are OK; incitement/hate against groups is NOT
- Constructive criticism is OK; personal attacks are NOT
- Jokes between friends are OK; targeted harassment is NOT
- Sharing your own contact info is OK; sharing others' private info is NOT

Be strict but fair. When in doubt, lean toward "warn" rather than "block".`

/**
 * Run AI moderation on text content
 */
export async function moderateWithAI(text: string): Promise<AIModerationResult> {
  // Step 1: Always run fast keyword filter first
  const keywordResult = moderateText(text)
  const keywordScore = keywordResult.score

  // Step 2: If keyword score is 0 and text is short, skip AI (performance)
  const shouldSkipAI = keywordScore === 0 && text.length < 50

  if (shouldSkipAI) {
    return {
      isViolation: false,
      severity: 0,
      categories: ['safe'],
      explanation: 'آمن — لا توجد مخالفات',
      action: 'allow',
      suggestedAction: 'السماح',
      confidence: 0.95,
      model: 'keyword-only',
      keywordScore,
      aiUsed: false,
    }
  }

  // Step 3: Run AI analysis
  const { data, error, model } = await chatJSON<{
    is_violation: boolean
    severity: number
    categories: ModerationCategory[]
    explanation: string
    suggested_action: 'allow' | 'warn' | 'flag' | 'block'
    confidence: number
  }>([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze this Arabic text for policy violations:\n\n"${text}"`,
    },
  ], {
    temperature: 0.2,
    maxTokens: 500,
  })

  if (error || !data) {
    // Fallback to keyword-only result if AI fails
    return {
      isViolation: keywordResult.isToxic,
      severity: keywordScore,
      categories: keywordResult.isToxic ? ['insults'] : ['safe'],
      explanation: keywordResult.reasons.join(', ') || 'فحص سريع',
      action: keywordResult.action === 'block' ? 'block' : keywordResult.action === 'flag' ? 'flag' : 'allow',
      suggestedAction: keywordResult.action === 'block' ? 'حظر' : keywordResult.action === 'flag' ? 'مراجعة' : 'السماح',
      confidence: 0.5,
      model: 'keyword-fallback',
      keywordScore,
      aiUsed: false,
    }
  }

  // Combine AI + keyword scores (weighted: AI 70%, keyword 30%)
  const combinedSeverity = Math.round(data.severity * 0.7 + keywordScore * 0.3)

  return {
    isViolation: data.is_violation || keywordResult.isToxic,
    severity: combinedSeverity,
    categories: data.categories?.length ? data.categories : (keywordResult.isToxic ? ['insults'] : ['safe']),
    explanation: data.explanation || keywordResult.reasons.join(', ') || '—',
    action: data.suggested_action || (keywordResult.action as any),
    suggestedAction: data.suggested_action === 'allow' ? 'السماح'
      : data.suggested_action === 'warn' ? 'تحذير'
      : data.suggested_action === 'flag' ? 'مراجعة'
      : 'حظر',
    confidence: data.confidence ?? 0.7,
    model,
    keywordScore,
    aiUsed: true,
  }
}

/**
 * Get Arabic label for a category
 */
export function getCategoryLabel(category: ModerationCategory): string {
  return CATEGORY_LABELS_AR[category] || category
}

/**
 * Determine if content should be auto-hidden based on severity
 */
export function shouldAutoHide(result: AIModerationResult): boolean {
  return result.action === 'block' || result.severity >= 80
}

/**
 * Determine if user should receive a warning
 */
export function shouldWarnUser(result: AIModerationResult): boolean {
  return result.action === 'warn' || (result.severity >= 30 && result.severity < 60)
}

/**
 * Determine if content should be flagged for admin review
 */
export function shouldFlagForReview(result: AIModerationResult): boolean {
  return result.action === 'flag' || (result.severity >= 50 && result.severity < 80)
}
