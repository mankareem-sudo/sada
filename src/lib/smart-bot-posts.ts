/**
 * Smart Bot Post Generator
 *
 * Uses OpenRouter AI to generate diverse, realistic Egyptian Arabic posts.
 * Also generates image posts with captions.
 */

import { chatCompletion } from './openrouter'
import { generateEgyptianPost, pickRandom } from './egyptian-bots'

const POST_SYSTEM_PROMPT = `أنت شخص مصري بتنشر منشور على منصة "صدى" الصوتية العربية.

قواعد المنشور:
1. اكتب باللهجة المصرية الطبيعية (مش فصحى)
2. المنشور لازم يكون أصيل وحقيقي، زي ما الناس بتكتب في السوشيال ميديا
3. متنفسش فلسفة كل شوية — اكتب حاجات يومية، خواطر، أسئلة، مواقف
4. المنشور قصير (1-3 جمل، max 500 حرف)
5. ممكن تستخدم إيموجي بس بشكل طبيعي (واحد أو اتنين بالكتير)

مواضيع متنوعة (اختار واحد عشوائي):
- يوميات: حاجة حصلتلك النهاردة
- خواطر: فكرة جتك وأنت ماشي أو قاعد
- أسئلة: سؤال بتحب تسمع آراء الناس فيه
- مشاعر: حاجة حسس بيها ودورت تشاركها
- نصايح: حاجة اتعلمتها وبتحب تشاركها
- قهوة/أكل: حاجة عن أكلة أو مشروب
- عائلة: حاجة عن أهلك أو بيتك
- شغل: حاجة عن الشغل أو الدنيا
- ذكريات: حاجة من زمان فكرتك
- أحلام: حاجة نفسك تعملها

أمثلة:
- "النهاردة وأنا راجع من الشغل، شفت عصفور بيأكل من إيد طفل. حاجة بسيطة بس فرحتني."
- "سؤال: إيه أكتر حاجة بتفتكرها من طفولتك وبتحن ليها؟"
- "القهوة الصبح هي اللي بتظبط الدنيا. من غيرها أنا مش أنا 😅"
- "بصراحة، أنا اتعلمت إن السكوت أحياناً أحسن من أي رد. مش كل حاجة تستاهل الرد."

جاوب بالمنشور فقط، بدون مقدمات.`

const IMAGE_CAPTION_PROMPT = `أنت شخص مصري بتنشر صورة على منصة "صدى". اكتب تعليق قصير على الصورة باللهجة المصرية (1-2 جملة max 200 حرف). ممكن تستخدم إيموجي واحد. جاوب بالتعليق فقط.`

// Image categories for bot posts (using picsum.photos for random images)
const IMAGE_CATEGORIES = [
  { url: 'https://picsum.photos/seed/{seed}/800/600', caption: null },
]

/**
 * Generate a smart AI-powered post
 */
export async function generateSmartPost(botName?: string): Promise<{
  content: string
  usedAI: boolean
  model: string
}> {
  try {
    const result = await chatCompletion({
      messages: [
        { role: 'system', content: POST_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `اكتب منشور مصري طبيعي.${botName ? ` (أنت اسمك ${botName})` : ''}`,
        },
      ],
      temperature: 0.9,
      maxTokens: 300,
    })

    if (!result.error && result.content && result.content.trim().length > 10) {
      let content = result.content.trim()
      // Clean up
      content = content.replace(/^["'`]|["'`]$/g, '').replace(/\*\*/g, '').trim()
      if (content.length > 500) {
        content = content.slice(0, 497) + '...'
      }
      if (content.length >= 10) {
        return { content, usedAI: true, model: result.model }
      }
    }
  } catch (e) {
    // Fall through
  }

  // Fallback to template
  return { content: generateEgyptianPost(), usedAI: false, model: 'template' }
}

/**
 * Generate a smart caption for an image post
 */
export async function generateImageCaption(botName?: string): Promise<{
  caption: string
  imageUrl: string
  usedAI: boolean
  model: string
}> {
  // Generate a random image URL
  const seed = Math.floor(Math.random() * 100000)
  const imageUrl = `https://picsum.photos/seed/${seed}/800/600`

  try {
    const result = await chatCompletion({
      messages: [
        { role: 'system', content: IMAGE_CAPTION_PROMPT },
        {
          role: 'user',
          content: `اكتب تعليق على صورة نشرتها.${botName ? ` (أنت اسمك ${botName})` : ''}`,
        },
      ],
      temperature: 0.9,
      maxTokens: 100,
    })

    if (!result.error && result.content && result.content.trim().length > 3) {
      let caption = result.content.trim().replace(/^["'`]|["'`]$/g, '').replace(/\*\*/g, '').trim()
      if (caption.length > 280) {
        caption = caption.slice(0, 277) + '...'
      }
      return { caption, imageUrl, usedAI: true, model: result.model }
    }
  } catch (e) {
    // Fall through
  }

  // Fallback caption
  const fallbackCaptions = [
    'منظر حلو النهاردة 📸',
    'النهاردة كان يوم حلو',
    'صورة من اليوم',
    'لحظة حلوة',
    'من القلب 🌅',
  ]
  return { caption: pickRandom(fallbackCaptions), imageUrl, usedAI: false, model: 'fallback' }
}
