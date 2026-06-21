import { db } from '@/lib/db'

// Pre-written prompts to seed the database
// These are carefully chosen to:
// - Avoid religion/politics (per user requirement)
// - Encourage reflection, learning, sharing real experiences
// - Work well in audio format (90 sec answers)
export const SEED_PROMPTS: { text: string; date: string }[] = [
  { text: 'إيه أكبر درس تعلمته في حياتك لحد دلوقتي؟', date: '2026-06-21' },
  { text: 'إيه مشروع أو حاجة جديدة بتبدأ فيها الفترة دي؟', date: '2026-06-22' },
  { text: 'إيه نصيحة كنت بتتمنى تعرفها وأنت أصغر سناً؟', date: '2026-06-23' },
  { text: 'إيه أكبر تحدي واجهته الأسبوع ده وإزاي تعاملت معاه؟', date: '2026-06-24' },
  { text: 'إيه مهارة جديدة بتحب تتعلمها وليله؟', date: '2026-06-25' },
  { text: 'إيه أكتر كتاب أو دورة أثروا فيك؟ وليه؟', date: '2026-06-26' },
  { text: 'إيه عادة صغيرة غيرت حياتك للأحسن؟', date: '2026-06-27' },
  { text: 'إيه أكبر خطأ ارتكبته وإيه تعلمت منه؟', date: '2026-06-28' },
  { text: 'إيه الشخصية اللي بتلهمك وإيه السبب؟', date: '2026-06-29' },
  { text: 'إيه حاجة نجحت فيها بعد ما فشلت كتير؟', date: '2026-06-30' },
  { text: 'إيه أكتر حاجة بتخليك سعيد في يومك العادي؟', date: '2026-07-01' },
  { text: 'لو تقدر ترجع يوم واحد في حياتك، هيكون إيه وهو ليه؟', date: '2026-07-02' },
  { text: 'إيه هدف بتشتغل عليه حالياً وإيه تقدمك فيه؟', date: '2026-07-03' },
  { text: 'إيه أحلى مدحة وصلتلك في حياتك ومين اللي مدحك؟', date: '2026-07-04' },
  { text: 'إيه أكتر حاجة بتخسر وقتك فيها وعايز توقفها؟', date: '2026-07-05' },
]

/**
 * Get the prompt for a specific date (YYYY-MM-DD).
 * If no prompt exists for that date, fall back to the closest future one,
 * or generate a generic one. For now, we require seeded prompts.
 */
export async function getPromptForDate(dateStr: string) {
  let prompt = await db.prompt.findUnique({
    where: { date: dateStr },
  })
  if (!prompt) {
    // Fall back to today's date in case of mismatch
    const fallback = await db.prompt.findFirst({
      orderBy: { date: 'desc' },
    })
    if (!fallback) return null
    return fallback
  }
  return prompt
}

export async function getTodayPrompt() {
  const today = new Date().toISOString().split('T')[0]
  return getPromptForDate(today)
}

export async function ensureSeedPrompts() {
  for (const p of SEED_PROMPTS) {
    await db.prompt.upsert({
      where: { date: p.date },
      create: { text: p.text, date: p.date },
      update: { text: p.text },
    })
  }
}

export function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}
