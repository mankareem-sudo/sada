/**
 * Image Compression Utility (Client-side)
 * 
 * Light compression only — Cloudinary does the heavy lifting:
 * - Auto WebP conversion
 * - Smart quality (q_auto)
 * - On-the-fly resizing via URL
 * 
 * We only resize to max 1280px and quality 0.85 to reduce upload bandwidth.
 * Final optimization happens on Cloudinary's servers.
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
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.85,
    maxSizeKB = 1500,
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

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Cannot get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        let currentQuality = quality
        let result = canvas.toDataURL('image/jpeg', currentQuality)
        
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
 * Compress avatar — light (Cloudinary will optimize further)
 * Just resize to max 512px and quality 0.85
 */
export function compressAvatar(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    maxSizeKB: 500,
  })
}

/**
 * Compress post image — light (Cloudinary will optimize further)
 * Resize to max 1280px and quality 0.85
 */
export function compressPostImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.85,
    maxSizeKB: 1500,
  })
}

/**
 * Compress comment image — light
 */
export function compressCommentImage(file: File): Promise<string> {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.8,
    maxSizeKB: 800,
  })
}
