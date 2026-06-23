/**
 * Image Compression Utility
 * 
 * Takes a large image (up to 10MB) and compresses it to a smaller size
 * while maintaining visual quality.
 * 
 * Strategy:
 * - Max dimensions: 1080px (Instagram-like)
 * - Quality: 80% for JPEG, preserves detail
 * - Output: JPEG (smaller than PNG for photos)
 * - Target: ~100-300KB final size
 */

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeKB?: number
}

/**
 * Compress an image file to base64 data URI
 */
export function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1080,
    maxHeight = 1080,
    quality = 0.8,
    maxSizeKB = 500,
  } = options

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else if (height > width && height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        } else if (width > maxWidth && height > maxHeight) {
          width = maxWidth
          height = maxHeight
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Cannot get canvas context'))
          return
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height)

        // Try progressive compression
        let currentQuality = quality
        let result = canvas.toDataURL('image/jpeg', currentQuality)
        
        // If still too large, reduce quality
        while (result.length > maxSizeKB * 1024 * 1.33 && currentQuality > 0.3) {
          currentQuality -= 0.1
          result = canvas.toDataURL('image/jpeg', currentQuality)
        }

        resolve(result)
      }
      img.onerror = () => reject(new Error('Cannot load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Cannot read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress avatar image (smaller dimensions for profile pics)
 * 200x200 is enough for avatars on mobile — they display at 32-80px
 */
export function compressAvatar(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.75,
    maxSizeKB: 80, // ~80KB per avatar
  })
}

/**
 * Compress post image (for feed)
 * 720px is enough for mobile screens — looks crisp on phones
 */
export function compressPostImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 720,
    maxHeight: 720,
    quality: 0.7,
    maxSizeKB: 200, // ~200KB per post image
  })
}

/**
 * Compress comment image (medium, inline)
 * 400px is enough for inline comment images
 */
export function compressCommentImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 480,
    maxHeight: 480,
    quality: 0.65,
    maxSizeKB: 100, // ~100KB per comment image
  })
}
