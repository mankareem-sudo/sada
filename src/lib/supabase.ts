/**
 * Sada Database Client — uses Supabase JS (HTTPS) instead of Prisma
 * 
 * Why: Vercel serverless functions can't reach Supabase direct DB host
 * (which is IPv6-only). Supabase JS client uses HTTPS (PostgREST API)
 * which works in any environment.
 * 
 * This module provides a Prisma-compatible interface so existing route
 * code doesn't need major changes.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Warning: Supabase env vars not set')
}

// Use service role key for server-side operations (bypasses RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'sada-server/1.0.0',
    },
  },
})

// Helper to generate cuid-like IDs
export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return 'c' + id
}

// Helper for current timestamp in ISO format
export function now(): string {
  return new Date().toISOString()
}

// Helper for date in N days
export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// Helper to execute raw SQL via Supabase rpc (if needed)
export async function executeSql(query: string, params?: any[]) {
  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: query,
  })
  if (error) throw error
  return data
}
