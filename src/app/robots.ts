import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/logger'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin.html',
          '/api/',
          '/settings',
          '/messages',
          '/notifications',
          '/bookmarks',
          '/embed/widget',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/admin.html', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
