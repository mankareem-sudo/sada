/**
 * Cloudinary Storage Service
 * 
 * Uploads images to Cloudinary (instead of base64 in DB or Supabase Storage).
 * 
 * Benefits:
 * - 25GB free storage + 25GB bandwidth/month
 * - Automatic WebP conversion (smaller files)
 * - On-the-fly resizing via URL transformations
 * - Global CDN (fast loading worldwide)
 * - Automatic compression + optimization
 * 
 * Credit-saving strategy:
 * - Client-side: light compression (just resize to max 1280px + quality 0.85)
 *   This reduces upload size by ~80% before it hits Cloudinary
 * - Cloudinary-side: automatic WebP + q_auto (smart quality)
 *   This reduces storage size by another ~50%
 * - For display: request specific sizes via URL (e.g. w_200 for avatars)
 *   This reduces bandwidth by ~70%
 * 
 * Net result: 10MB upload → ~50KB stored → ~15KB served
 */

import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ''
const API_KEY = process.env.CLOUDINARY_API_KEY || ''
const API_SECRET = process.env.CLOUDINARY_API_SECRET || ''

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  })
}

/**
 * Upload an image to Cloudinary from a base64 data URI
 * 
 * @param dataUri - base64 data URI (data:image/...;base64,...)
 * @param folder - Cloudinary folder (avatars, posts, comments)
 * @returns Cloudinary public URL
 */
export async function uploadToCloudinary(
  dataUri: string,
  folder: string = 'general'
): Promise<string | null> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('[cloudinary] Missing credentials')
    return null
  }

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `sada/${folder}`,
      resource_type: 'image',
      // Automatic format optimization (WebP for modern browsers)
      format: 'webp',
      // Smart quality — reduces size without visible quality loss
      quality: 'auto',
      // Automatic optimization
      fetch_format: 'auto',
      // Don't create eager transformations (saves credits)
      // We use on-the-fly URL transformations instead
    })

    return result.secure_url
  } catch (e: any) {
    console.error('[cloudinary] Upload error:', e?.message || e)
    return null
  }
}

/**
 * Upload avatar image to Cloudinary
 */
export async function uploadAvatar(dataUri: string): Promise<string | null> {
  return uploadToCloudinary(dataUri, 'avatars')
}

/**
 * Upload post image to Cloudinary
 */
export async function uploadPostImage(dataUri: string): Promise<string | null> {
  return uploadToCloudinary(dataUri, 'posts')
}

/**
 * Upload comment image to Cloudinary
 */
export async function uploadCommentImage(dataUri: string): Promise<string | null> {
  return uploadToCloudinary(dataUri, 'comments')
}

/**
 * Upload voice note to Cloudinary
 */
export async function uploadVoiceNote(dataUri: string): Promise<string | null> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('[cloudinary] Missing credentials')
    return null
  }

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'sada/voice-notes',
      resource_type: 'video', // Cloudinary treats audio as 'video'
      format: 'webm',
    })

    return result.secure_url
  } catch (e: any) {
    console.error('[cloudinary] Voice upload error:', e?.message || e)
    return null
  }
}

/**
 * Delete a file from Cloudinary by URL
 */
export async function deleteFromCloudinary(publicUrl: string): Promise<boolean> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) return false

  try {
    // Extract public_id from URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/sada/{folder}/{filename}.webp
    const match = publicUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.(webp|jpg|png|gif|mp4|webm)/)
    if (!match) return false

    const publicId = match[1]
    await cloudinary.uploader.destroy(publicId, {
      resource_type: publicUrl.includes('/video/') ? 'video' : 'image',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Get a resized version of a Cloudinary URL
 * 
 * This is the MAGIC of Cloudinary — you can request any size
 * just by modifying the URL. No need to store multiple versions.
 * 
 * Example:
 *   getResizedUrl(url, 200, 200) → 200x200 avatar thumbnail
 *   getResizedUrl(url, 720, 720) → 720x720 post image
 *   getResizedUrl(url, 48, 48) → 48x48 tiny avatar
 * 
 * This saves bandwidth: instead of loading 200KB image for a 48px avatar,
 * we load a ~3KB thumbnail.
 */
export function getResizedUrl(
  originalUrl: string,
  width: number,
  height: number,
  quality: 'auto' | 'low' | 'high' = 'auto'
): string {
  if (!originalUrl || !originalUrl.includes('res.cloudinary.com')) {
    return originalUrl // Not a Cloudinary URL, return as-is
  }

  // Insert transformation parameters
  // URL: .../image/upload/v123/sada/avatars/file.webp
  // Becomes: .../image/upload/c_fill,w_200,h_200,q_auto/v123/sada/avatars/file.webp
  
  const qualityParam = quality === 'low' ? 'q_30' : quality === 'high' ? 'q_90' : 'q_auto'
  const transformation = `c_fill,w_${width},h_${height},${qualityParam},f_auto`

  return originalUrl.replace('/upload/', `/upload/${transformation}/`)
}

/**
 * Get avatar URL at specific size
 */
export function getAvatarUrl(url: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  const sizes = { sm: 48, md: 96, lg: 128, xl: 256 }
  return getResizedUrl(url, sizes[size], sizes[size])
}

/**
 * Get post image URL at specific size
 */
export function getPostImageUrl(url: string, size: 'thumb' | 'medium' | 'full' = 'medium'): string {
  const sizes = { thumb: 200, medium: 720, full: 1080 }
  return getResizedUrl(url, sizes[size], sizes[size])
}

/**
 * Get comment image URL at specific size
 */
export function getCommentImageUrl(url: string): string {
  return getResizedUrl(url, 480, 480, 'low')
}
