/**
 * Production-safe logger
 *
 * - In production: only logs warnings and errors (not info/debug)
 * - In development: logs everything
 * - Can be easily extended to send logs to Sentry/Datadog
 */

const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  debug: (...args: any[]) => {
    if (!isProduction) console.debug('[DEBUG]', ...args)
  },

  info: (...args: any[]) => {
    if (!isProduction) console.info('[INFO]', ...args)
  },

  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },

  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  },

  /** Log with context (useful for debugging specific features) */
  tag: (tag: string) => ({
    debug: (...args: any[]) => {
      if (!isProduction) console.debug(`[${tag}]`, ...args)
    },
    info: (...args: any[]) => {
      if (!isProduction) console.info(`[${tag}]`, ...args)
    },
    warn: (...args: any[]) => {
      console.warn(`[${tag}]`, ...args)
    },
    error: (...args: any[]) => {
      console.error(`[${tag}]`, ...args)
    },
  }),
}

/**
 * Get the app's base URL from environment variable.
 * Falls back to the Vercel URL or the known production URL.
 */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://my-project-one-lake-82.vercel.app'
  )
}
