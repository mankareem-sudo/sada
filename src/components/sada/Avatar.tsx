'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  imageUrl?: string | null
  isVerified?: boolean
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

export function Avatar({ name, color, size = 'md', imageUrl, isVerified, className }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  
  if (imageUrl) {
    const resizedUrl = getCloudinaryUrl(imageUrl, cloudinarySizes[size])
    return (
      <div className="relative shrink-0">
        <img
          src={resizedUrl}
          alt={name}
          className={cn(
            'rounded-full object-cover shadow-inner border-2 border-border/30',
            sizes[size],
            className
          )}
          loading="lazy"
        />
        {isVerified && (
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-bold text-white shadow-inner',
          sizes[size],
          className
        )}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        aria-label={name}
      >
        {initial}
      </div>
      {isVerified && (
        <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}
