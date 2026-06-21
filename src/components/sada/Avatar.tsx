'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

export function Avatar({ name, color, size = 'md', className }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
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
