/**
 * Sada DB Adapter
 * 
 * Since Vercel serverless functions cannot reach Supabase directly (IPv6-only host),
 * we use a Supabase Edge Function as a DB proxy. The Edge Function runs on
 * Supabase's servers which have IPv6 outbound, and exposes an HTTPS endpoint
 * that accepts SQL queries.
 * 
 * This file provides a Prisma-compatible interface that routes queries
 * through the Edge Function.
 */

const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/sada-db'
const SADA_API_TOKEN = process.env.SADA_API_TOKEN || 'sada-internal-token-2026'

// We import the real Prisma client but override its query methods
// Actually, let's create a custom adapter that mimics the Prisma client API

import { PrismaClient } from '@prisma/client'

// Cache the Prisma client for direct connection (used when available)
let prismaClient: PrismaClient | null = null
let prismaFailed = false

function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: ['error'],
    })
  }
  return prismaClient
}

interface QueryResult {
  rows: any[]
  count: number
}

async function executeViaEdgeFunction(query: string, params?: any[]): Promise<QueryResult> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sada-token': SADA_API_TOKEN,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query, params }),
  })
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown' }))
    throw new Error(`Edge Function error: ${err.error || response.statusText}`)
  }
  
  return await response.json()
}

/**
 * Try direct Prisma connection first (works in dev with IPv6 access).
 * Falls back to Edge Function proxy (works in Vercel production).
 */
export async function tryDirectFirst<T>(
  directFn: () => Promise<T>,
  fallbackQuery?: string,
  fallbackParams?: any[]
): Promise<T> {
  // If we already know direct connection fails, use Edge Function
  if (prismaFailed && fallbackQuery) {
    const result = await executeViaEdgeFunction(fallbackQuery, fallbackParams)
    return result.rows as T
  }
  
  try {
    return await directFn()
  } catch (e: any) {
    // If it's a connection error, mark as failed and try Edge Function
    if (
      e?.message?.includes("Can't reach database server") ||
      e?.message?.includes("ECONNREFUSED") ||
      e?.message?.includes("ETIMEDOUT") ||
      e?.message?.includes("connect ETIMEDOUT")
    ) {
      prismaFailed = true
      if (fallbackQuery) {
        const result = await executeViaEdgeFunction(fallbackQuery, fallbackParams)
        return result.rows as T
      }
    }
    throw e
  }
}

// Export the raw Edge Function executor for custom queries
export { executeViaEdgeFunction, getPrismaClient }
