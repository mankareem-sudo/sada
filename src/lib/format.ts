// Time/date formatting helpers in Arabic
const arRelativeFormatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

export function timeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffMs = date.getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (Math.abs(diffSec) < 60) return 'الآن'
  if (Math.abs(diffMin) < 60) return arRelativeFormatter.format(diffMin, 'minute')
  if (Math.abs(diffHour) < 24) return arRelativeFormatter.format(diffHour, 'hour')
  if (Math.abs(diffDay) < 30) return arRelativeFormatter.format(diffDay, 'day')
  const diffMonth = Math.round(diffDay / 30)
  if (Math.abs(diffMonth) < 12) return arRelativeFormatter.format(diffMonth, 'month')
  return arRelativeFormatter.format(Math.round(diffDay / 365), 'year')
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatCount(n: number): string {
  if (n < 1000) return n.toString()
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return `${(n / 1_000_000).toFixed(1)}M`
}

const arDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatArabicDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return arDateFormatter.format(date)
}

export function formatShortDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}
