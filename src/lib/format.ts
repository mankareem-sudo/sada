// Time/date formatting helpers in Arabic
const arRelativeFormatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

/**
 * Parse a date string that might come in various formats:
 * - ISO: "2026-06-25T06:17:33.556Z"
 * - PostgreSQL: "2026-06-25 06:17:33.556" (no T, no Z — interpreted as UTC by Supabase)
 * - Already a Date object
 *
 * The key fix: Supabase returns timestamps WITHOUT timezone info.
 * PostgreSQL stores them as UTC, but JavaScript's new Date() treats
 * strings without 'Z' as LOCAL time, causing the wrong offset.
 *
 * Solution: Always append 'Z' (UTC) if the string has no timezone marker.
 */
function parseDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput

  let str = dateInput as string

  // Replace space with T (PostgreSQL format → ISO format)
  if (str.includes(' ')) {
    str = str.replace(' ', 'T')
  }

  // If no timezone marker (Z, +, -), assume UTC (Supabase stores in UTC)
  // Check if there's already a Z or timezone offset at the end
  // Format: ...T...Z or ...T...+00:00 or ...T...-03:00
  const hasTimezone = /([Zz]|[+-]\d{2}:?\d{2})$/.test(str)

  if (!hasTimezone && str.includes('T')) {
    str = str + 'Z'
  }

  // If it's just a date (YYYY-MM-DD), no timezone needed
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + 'T00:00:00Z')
  }

  return new Date(str)
}

export function timeAgo(dateInput: string | Date): string {
  const date = parseDate(dateInput)
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
  timeZone: 'UTC', // Supabase stores in UTC
})

export function formatArabicDate(dateInput: string | Date): string {
  const date = parseDate(dateInput)
  return arDateFormatter.format(date)
}

export function formatShortDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const d = new Date(dateStr + 'T00:00:00Z')
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(d)
}
