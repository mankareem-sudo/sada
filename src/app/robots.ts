import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://my-project-one-lake-82.vercel.app'

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
