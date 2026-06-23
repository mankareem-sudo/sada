'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  imageUrl?: string | null
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

// Cloudinary resize sizes (pixels)
const cloudinarySizes = {
  sm: 48,
  md: 96,
  lg: 128,
  xl: 256,
}

function getCloudinaryUrl(url: string, size: number): string {
  if (!url || !url.includes('res.cloudinary.com')) return url
  // Insert transformation: c_fill,w_X,h_X,q_auto,f_auto
  const transformation = `c_fill,w_${size},h_${size},q_auto,f_auto`
  return url.replace('/upload/', `/upload/${transformation}/`)
}

export function Avatar({ name, color, size = 'md', imageUrl, className }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  
  if (imageUrl) {
    const resizedUrl = getCloudinaryUrl(imageUrl, cloudinarySizes[size])
    return (
      <img
        src={resizedUrl}
        alt={name}
        className={cn(
          'rounded-full object-cover shrink-0 shadow-inner border-2 border-border/30',
          sizes[size],
          className
        )}
        loading="lazy"
      />
    )
  }
  
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-white shrink-0 shadow-inner',
        sizes[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      }}
      aria-label={name}
    >
      {initial}
    </div>
  )
}
