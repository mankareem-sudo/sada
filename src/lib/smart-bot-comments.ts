/**
 * Smart Bot Comment Generator
 *
 * Uses OpenRouter free AI models to generate contextual Egyptian Arabic
 * comments that are relevant to the post content.
 *
 * Falls back to keyword-based matching if AI is unavailable.
 */

import { chatJSON, chatCompletion } from './openrouter'
import { generateEgyptianComment, pickRandom } from './egyptian-bots'

const COMMENT_SYSTEM_PROMPT = `أنت شخص مصري بتعمل تعليق على منشور في منصة "صدى" الصوتية العربية.

قواعد التعليق:
1. اكتب تعليق مصري طبيعي باللهجة المصرية (مش فصحى)
2. التعليق لازم يكون له علاقة مباشرة بموضوع المنشور
3. التعليق لازم يكون قصير (1-2 جملة، max 280 حرف)
4. التعليق لازم يكون محترم وبنّاء (مفيش شتيمة ولا سخرية)
5. التعليق ممكن يكون: موافقة، إضافة معلومة، سؤال، تجربة شخصية، أو شعور
6. خلي التعليق طبيعي زي ما المصريين بيتكلموا في الحياة اليومية
7. مفيش حاجة للإيموجي إلا لو طبيعي

أمثلة للأسلوب:
- "كلامك صح والله، أنا حاسس بنفس الإحساس"
- "ربنا يكرمك، أنا مررت بنفس الموقف"
- "إضافة حلوة، بس أنا شايف الموضوع من زاوية تانية"
- "سؤال جميل، خلاني أفكر"

جاوب بالتعليق فقط، بدون مقدمات ولا شرح.`

/**
 * Generate a smart contextual comment using AI
 *
 * @param postContent The post content to comment on
 * @param botName The bot's name (for personality variety)
 * @returns A relevant Egyptian Arabic comment
 */
export async function generateSmartComment(
  postContent: string,
  botName?: string
): Promise<{ comment: string; usedAI: boolean; model: string }> {
  // Try AI first (if post is long enough to warrant it)
  if (postContent.length > 20) {
    try {
      // Use chatCompletion (text, not JSON) since we just need a comment
      const result = await chatCompletion({
        messages: [
          { role: 'system', content: COMMENT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `اكتب تعليق مصري طبيعي على المنشور ده:\n\n"${postContent}"\n\n${botName ? `(أنت اسمك ${botName})` : ''}`,
          },
        ],
        temperature: 0.8, // Higher temperature for variety
        maxTokens: 150,
      })

      console.log('[SmartComment] AI result:', JSON.stringify({
        hasContent: !!result.content,
        contentLength: result.content?.length || 0,
        model: result.model,
        error: result.error,
      }))

      if (!result.error && result.content) {
        let comment = result.content.trim()
        // Clean up: remove quotes, markdown, extra whitespace
        comment = comment.replace(/^["'`]|["'`]$/g, '').replace(/\*\*/g, '').trim()
        // Take only the first 280 chars if longer
        if (comment.length > 280) {
          comment = comment.slice(0, 277) + '...'
        }
        // Accept any non-empty comment (even short ones like "كلامك صح")
        if (comment.length >= 2) {
          return { comment, usedAI: true, model: result.model }
        }
      }
    } catch (e) {
      console.warn('[SmartComment] AI failed:', e instanceof Error ? e.message : String(e))
    }
  }

  // Fallback: keyword-based contextual comment
  const fallback = generateKeywordBasedComment(postContent)
  return { comment: fallback, usedAI: false, model: 'keyword-fallback' }
}

/**
 * Keyword-based comment generation (fallback when AI unavailable)
 *
 * Analyzes the post content and returns a relevant comment based on
 * detected keywords/topics.
 */
function generateKeywordBasedComment(postContent: string): string {
  const content = postContent.toLowerCase()

  // Question posts
  if (content.includes('؟') || content.includes('?') || content.includes('ليه') || content.includes('إيه') || content.includes('ازاي')) {
    return pickRandom([
      'سؤال محيرني كمان، يستاهل التفكير',
      'أنا نفسي أعرف إجابة السؤال ده',
      'سؤال حلو، خلاني أفكر فعلاً',
      'مش عارف أرد، بس السؤال مهم',
      'أنا شخصياً بسأل نفسي السؤال ده كتير',
    ])
  }

  // Sad/struggle posts
  if (content.includes('تعب') || content.includes('صعب') || content.includes('حزين') || content.includes('ألم') || content.includes('مشكلة')) {
    return pickRandom([
      'ربنا يعينك، الدنيا صعبة بس بتعدي',
      'أنا حاسس بيك، كلنا بنمر بفترات صعبة',
      'خليك قوي، بعد العسر يسر',
      'صبرك جميل، ربنا معاك',
      'ماشفتش حزن طال، افرح ربنا موجود',
    ])
  }

  // Happy/positive posts
  if (content.includes('فرح') || content.includes('سعيد') || content.includes('حلو') || content.includes('مبسوط') || content.includes('الحمد')) {
    return pickRandom([
      'الحمد لله إنك مبسوط، ربنا يديم السعادة',
      'كلامك بيفرح القلب، الله يخليك',
      'منور يا صاحبي، استمر',
      'ربنا يبارك فيك، فرحتنا معاك',
      'الحمد لله دايماً، ربنا يديم النعمة',
    ])
  }

  // Family posts
  if (content.includes('أمي') || content.includes('بابا') || content.includes('أولاد') || content.includes('عائلة') || content.includes('بيت')) {
    return pickRandom([
      'العائلة هي الأهم، ربنا يخليهم لك',
      'أهلك كنز، حافظ عليهم',
      'كلامك صح، البيت هو الوطن',
      'ربنا يبارك في عيلتك',
      'أهلك تربوا كويس، بين في كلامك',
    ])
  }

  // Life/philosophy posts
  if (content.includes('حياة') || content.includes('دنيا') || content.includes('وقت') || content.includes('زمن')) {
    return pickRandom([
      'كلامك عميق، خلاني أفكر',
      'فلسفة حلوة، أنا معاك في اللي بتقوله',
      'الزمن بيجري فعلاً، لازم ننتبه',
      'الحياة مدرسة، وانت بتتعلم',
      'كلام يحتاج وقفة، تسلم',
    ])
  }

  // Egypt-specific posts
  if (content.includes('مصر') || content.includes('مصري') || content.includes('بلد')) {
    return pickRandom([
      'مصر تستاهل، ربنا يحفظها',
      'بلدنا غالية علينا كلنا',
      'المصري طيب بالفطرة، كلامك صح',
      'مصر في القلب دايماً',
      'ربنا يخلي بلدنا ويصلح أحوالها',
    ])
  }

  // Work/money posts
  if (content.includes('شغل') || content.includes('فلوس') || content.includes('نجاح') || content.includes('مصاريف')) {
    return pickRandom([
      'الشغل بركة، ربنا يوفقك',
      'الفلوس مش كل حاجة، بس مهمة',
      'النجاح محتاج صبر، استمر',
      'ربنا يرزقك من حيث لا تحتسب',
      'الشغل الشريف بركة مهما كان بسيط',
    ])
  }

  // Food posts
  if (content.includes('أكل') || content.includes('قهوة') || content.includes('كشري') || content.includes('طعام')) {
    return pickRandom([
      'القهوة المصرية مفيش زيها، كلامك صح',
      'الكشري ملك الأكلات المصرية',
      'فتحت شهيتي، تسلم',
      'الأكل المصري ليه طعم خاص',
      'القهوة بتفتح النفس والذهن',
    ])
  }

  // Religious posts
  if (content.includes('ربنا') || content.includes('إيمان') || content.includes('صبر') || content.includes('دعاء') || content.includes('حمد')) {
    return pickRandom([
      'آمين، ربنا يستجب',
      'الصبر مفتاح الفرج، كلامك صح',
      'ربنا يديم نعمته علينا',
      'الحمد لله على كل حال',
      'الإيمان بيريّح القلب فعلاً',
    ])
  }

  // Hope/future posts
  if (content.includes('أمل') || content.includes('مستقبل') || content.includes('بكرة') || content.includes('حلم')) {
    return pickRandom([
      'الأمل آخر ما يموت، استمر',
      'بكرة أحسن إن شاء الله',
      'الحلم يستاهل المكافحة',
      'ربنا يحقق أحلامك',
      'التفاؤل جميل، خليه كده',
    ])
  }

  // Default: general reactions
  return generateEgyptianComment()
}

/**
 * Generate a smart bot reply to another comment
 */
export async function generateSmartReply(
  postContent: string,
  parentComment: string,
  botName?: string
): Promise<{ reply: string; usedAI: boolean; model: string }> {
  try {
    const result = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: COMMENT_SYSTEM_PROMPT + '\n\nأنت بترد على تعليق تاني في نفس المنشور. ردك لازم يكون طبيعي وقصير.',
        },
        {
          role: 'user',
          content: `المنشور: "${postContent}"\n\nالتعليق اللي بترد عليه: "${parentComment}"\n\nاكتب رد مصري طبيعي.${botName ? ` (أنت اسمك ${botName})` : ''}`,
        },
      ],
      temperature: 0.8,
      maxTokens: 120,
    })

    if (!result.error && result.content && result.content.trim().length > 5) {
      let reply = result.content.trim().replace(/^["'`]|["'`]$/g, '').replace(/\*\*/g, '')
      if (reply.length >= 5 && reply.length <= 280) {
        return { reply, usedAI: true, model: result.model }
      }
    }
  } catch (e) {
    // Fall through
  }

  return { reply: generateEgyptianComment(), usedAI: false, model: 'fallback' }
}
