import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/posts/link-preview
 * body: { url }
 *
 * Fetches OpenGraph metadata for a URL.
 * Returns: { url, title, description, image, siteName }
 *
 * Used by PostComposer to preview links before publishing a post.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
  }

  const body = await req.json()
  const { url } = body as { url?: string }

  if (!url) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 })
  }

  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('invalid protocol')
    }
  } catch {
    return NextResponse.json({ error: 'رابط غير صحيح' }, { status: 400 })
  }

  // Fetch the page with timeout
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'SadaBot/1.0 (link preview; +https://sada.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({ url, title: parsedUrl.hostname, description: null, image: null })
    }

    const html = await res.text()
    const meta = extractOpenGraph(html, parsedUrl)

    return NextResponse.json(meta)
  } catch (e) {
    // Fallback: just return hostname
    return NextResponse.json({
      url: parsedUrl.toString(),
      title: parsedUrl.hostname,
      description: null,
      image: null,
      siteName: parsedUrl.hostname.replace(/^www\./, ''),
    })
  }
}

/**
 * Extract OpenGraph + Twitter Card + <title>/<meta description> from HTML.
 */
function extractOpenGraph(html: string, baseUrl: URL) {
  const get = (re: RegExp): string | null => {
    const m = html.match(re)
    return m?.[1]?.trim() || null
  }

  const ogTitle =
    get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    get(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
    get(/<title>([^<]+)<\/title>/i)

  const ogDescription =
    get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    get(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i) ||
    get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)

  const ogImage =
    get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    get(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)

  const ogSiteName =
    get(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
    baseUrl.hostname.replace(/^www\./, '')

  // Resolve relative image URLs
  let resolvedImage = ogImage
  if (ogImage && !ogImage.startsWith('http')) {
    try {
      resolvedImage = new URL(ogImage, baseUrl).toString()
    } catch {
      resolvedImage = null
    }
  }

  return {
    url: baseUrl.toString(),
    title: ogTitle ? decodeEntities(ogTitle).slice(0, 200) : null,
    description: ogDescription ? decodeEntities(ogDescription).slice(0, 300) : null,
    image: resolvedImage,
    siteName: ogSiteName,
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}
