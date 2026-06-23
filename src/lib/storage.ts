/**
 * Supabase Storage Service
 * 
 * Uploads files to Supabase Storage (instead of base64 in DB).
 * Files are stored as public URLs — much faster, smaller DB, CDN-backed.
 * 
 * Buckets:
 * - avatars: profile pictures (public)
 * - posts: post images (public)
 * - voice-notes: voice recordings (public)
 * - comments: comment images/voice (public)
 */

import { supabase } from './db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Upload a file to Supabase Storage
 * Returns the public URL
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  fileData: string, // base64 data URI
  contentType: string
): Promise<string | null> {
  try {
    // Extract base64 data from data URI
    const match = fileData.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      console.error('[storage] Invalid data URI')
      return null
    }
    
    const [, , base64Data] = match
    
    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Upload using service role key (bypasses RLS)
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    )
    
    if (!response.ok) {
      const err = await response.text()
      console.error('[storage] Upload error:', err)
      return null
    }
    
    // Return public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`
    return publicUrl
  } catch (e) {
    console.error('[storage] Upload exception:', e)
    return null
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
      }
    )
    return response.ok
  } catch {
    return false
  }
}

/**
 * Generate a unique file path
 */
export function generateFilePath(extension: string = 'jpg'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 10)
  return `${timestamp}_${random}.${extension}`
}

/**
 * Get content type from data URI
 */
export function getContentType(dataUri: string): string {
  const match = dataUri.match(/^data:([^;]+);base64,/)
  return match ? match[1] : 'application/octet-stream'
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(dataUri: string): Promise<string | null> {
  const contentType = getContentType(dataUri)
  const ext = contentType.includes('png') ? 'png' : 
              contentType.includes('gif') ? 'gif' :
              contentType.includes('webp') ? 'webp' : 'jpg'
  const path = generateFilePath(ext)
  return uploadFile('avatars', path, dataUri, contentType)
}

/**
 * Upload post image
 */
export async function uploadPostImage(dataUri: string): Promise<string | null> {
  const contentType = getContentType(dataUri)
  const ext = contentType.includes('png') ? 'png' : 
              contentType.includes('gif') ? 'gif' :
              contentType.includes('webp') ? 'webp' : 'jpg'
  const path = generateFilePath(ext)
  return uploadFile('posts', path, dataUri, contentType)
}

/**
 * Upload voice note
 */
export async function uploadVoiceNote(dataUri: string): Promise<string | null> {
  const contentType = getContentType(dataUri)
  const ext = contentType.includes('webm') ? 'webm' : 
              contentType.includes('ogg') ? 'ogg' :
              contentType.includes('mp4') ? 'mp4' : 'webm'
  const path = generateFilePath(ext)
  return uploadFile('voice-notes', path, dataUri, contentType)
}

/**
 * Upload comment image
 */
export async function uploadCommentImage(dataUri: string): Promise<string | null> {
  const contentType = getContentType(dataUri)
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const path = generateFilePath(ext)
  return uploadFile('comments', path, dataUri, contentType)
}
