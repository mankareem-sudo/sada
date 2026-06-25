import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/openrouter'
import { generateSmartComment } from '@/lib/smart-bot-comments'

/**
 * GET /api/debug/smart-comment
 * 
 * Tests the smart comment generator directly.
 * Query: ?post=<post content>
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const post = url.searchParams.get('post') || 'الحياة مش طويلة قد ما بنفتكر. اللحظة اللي بنضيعها في قلق، مش هترجع. عيشوا كل يوم.'

  const apiKey = process.env.OPENROUTER_API_KEY

  // Test 1: Direct chatCompletion
  console.log('[DEBUG] Testing direct chatCompletion...')
  const directResult = await chatCompletion({
    messages: [
      { role: 'system', content: 'اكتب تعليق مصري قصير باللهجة المصرية. جاوب بالتعليق فقط.' },
      { role: 'user', content: `اكتب تعليق على: "${post}"` },
    ],
    temperature: 0.8,
    maxTokens: 100,
  })

  // Test 2: generateSmartComment
  console.log('[DEBUG] Testing generateSmartComment...')
  const smartResult = await generateSmartComment(post, 'أحمد')

  return NextResponse.json({
    apiKeySet: !!apiKey,
    post,
    directCall: {
      success: !!directResult.content,
      content: directResult.content,
      contentLength: directResult.content?.length || 0,
      model: directResult.model,
      error: directResult.error,
    },
    smartComment: {
      comment: smartResult.comment,
      usedAI: smartResult.usedAI,
      model: smartResult.model,
    },
  })
}
