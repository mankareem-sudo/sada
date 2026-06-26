import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://my-project-one-lake-82.vercel.app'
  const lastModified = new Date()

  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/help`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/embed`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  return staticPages
}
