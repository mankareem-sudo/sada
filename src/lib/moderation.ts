/**
 * AI Moderation — Arabic toxicity detection
 *
 * Uses a hybrid approach:
 * 1. Arabic bad-words list (fast, offline)
 * 2. Pattern detection (spam, harassment, hate speech signals)
 *
 * Returns:
 * - isToxic: boolean
 * - score: 0-100 (0 = safe, 100 = very toxic)
 * - reasons: string[] (which patterns matched)
 * - action: 'allow' | 'flag' | 'block'
 */

interface ModerationResult {
  isToxic: boolean
  score: number
  reasons: string[]
  action: 'allow' | 'flag' | 'block'
  flaggedWords: string[]
}

// Arabic toxic words/phrases list (categorized)
const TOXIC_WORDS = {
  insults: [
    'غبي', 'أحمق', 'حمار', 'كلب', 'خنزير', 'حقير', 'وضيع', 'سافل',
    'منحط', 'حقود', 'ماكر', 'خائن', 'عميل', 'خائن',
    'ابن', 'أبن', // will check context for "ابن الـ..."
  ],
  profanity: [
    'يلعن', 'كس', 'زب', 'طيز', 'شرموط', 'قحبة', 'منيك', 'نيك',
    'متناك', 'متناكة', 'عرص', 'لوطي', 'شاذ',
  ],
  hate: [
    'كافر', 'مرتد', 'زنديق', 'رافضي', 'ناصبي', 'وهابي',
  ],
  spam: [
    'اشترك', 'تابعني', 'لايك', 'متابعة متابعة', 'شير', 'منشن',
    'كسب', 'ربح', 'مجاني', 'عرض خاص', 'انضم الآن',
  ],
}

// Harassment patterns (regex)
const HARASSMENT_PATTERNS = [
  { pattern: /تباً لك|اللعنة|تباً|لعنة/gi, reason: 'لعن', category: 'profanity' },
  { pattern: /اقتل|أقتل|الموت|يموت/gi, reason: 'تهديد بالقتل', category: 'threat' },
  { pattern: /سأضرب|أضربك|سأضربك|أكسر/gi, reason: 'تهديد بالضرب', category: 'threat' },
  { pattern: /اخرس|اسكت| shut up/gi, reason: 'إسكات', category: 'rudeness' },
  { pattern: /ارحل|غادر|اتمتى|اتمتى/gi, reason: 'طرد', category: 'rudeness' },
]

// Spam patterns
const SPAM_PATTERNS = [
  { pattern: /(https?:\/\/[^\s]+)/gi, reason: 'روابط خارجية', category: 'spam' },
  { pattern: /(\d{5,})/g, reason: 'أرقام مشبوهة', category: 'spam' },
  { pattern: /(.)\1{4,}/g, reason: 'تكرار حرف', category: 'spam' }, // aaaaa
  { pattern: /(\S+)\s+\1\s+\1/gi, reason: 'تكرار كلمة', category: 'spam' }, // word word word
]

/**
 * Check text for toxic content
 */
export function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { isToxic: false, score: 0, reasons: [], action: 'allow', flaggedWords: [] }
  }

  const normalizedText = text.toLowerCase().trim()
  let score = 0
  const reasons: string[] = []
  const flaggedWords: string[] = []

  // Check insults
  for (const word of TOXIC_WORDS.insults) {
    if (normalizedText.includes(word.toLowerCase())) {
      score += 15
      reasons.push('إهانة')
      flaggedWords.push(word)
    }
  }

  // Check profanity (higher weight)
  for (const word of TOXIC_WORDS.profanity) {
    if (normalizedText.includes(word.toLowerCase())) {
      score += 30
      reasons.push('ألفاظ نابية')
      flaggedWords.push(word)
    }
  }

  // Check hate speech
  for (const word of TOXIC_WORDS.hate) {
    if (normalizedText.includes(word.toLowerCase())) {
      score += 20
      reasons.push('خطاب كراهية')
      flaggedWords.push(word)
    }
  }

  // Check spam keywords
  let spamCount = 0
  for (const word of TOXIC_WORDS.spam) {
    if (normalizedText.includes(word.toLowerCase())) {
      spamCount++
      flaggedWords.push(word)
    }
  }
  if (spamCount >= 2) {
    score += 25
    reasons.push('سبام')
  } else if (spamCount === 1) {
    score += 5
  }

  // Check harassment patterns
  for (const { pattern, reason } of HARASSMENT_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) {
      score += 20 * matches.length
      reasons.push(reason)
      flaggedWords.push(...matches.slice(0, 3))
    }
  }

  // Check spam patterns
  for (const { pattern, reason } of SPAM_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) {
      score += 10 * Math.min(matches.length, 3)
      reasons.push(reason)
    }
  }

  // Check for excessive caps (shouting)
  const capsRatio = (text.match(/[A-Z\u0600-\u06FF]/g) || []).length / text.length
  if (capsRatio > 0.6 && text.length > 20) {
    score += 10
    reasons.push('صراخ (CAPS)')
  }

  // Cap score at 100
  score = Math.min(score, 100)

  // Determine action
  let action: 'allow' | 'flag' | 'block' = 'allow'
  if (score >= 60) {
    action = 'block'
  } else if (score >= 30) {
    action = 'flag'
  }

  // Dedupe reasons
  const uniqueReasons = [...new Set(reasons)]

  return {
    isToxic: score >= 30,
    score,
    reasons: uniqueReasons,
    action,
    flaggedWords: [...new Set(flaggedWords)].slice(0, 5),
  }
}

/**
 * Check if a user can bypass moderation (admins always can)
 */
export function canBypassModeration(userRole: string): boolean {
  return userRole === 'admin'
}
