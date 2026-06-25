/**
 * Sada Database Client (Prisma-compatible wrapper over Supabase JS)
 * 
 * Why: Vercel serverless functions can't reach Supabase's direct DB host
 * (IPv6-only). Supabase JS client uses HTTPS (PostgREST API) which works
 * in any environment.
 * 
 * This module provides a Prisma-compatible interface so existing route
 * code doesn't need to change.
 * 
 * Supported operations: findUnique, findFirst, findMany, create, createMany,
 *                       update, updateMany, delete, deleteMany, count, aggregate
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[db] Warning: Supabase env vars not set')
  }
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'X-Client-Info': 'sada-server/1.0.0' } },
})

// ===== Helpers =====

// Generate a cuid-like ID (24 chars, starts with 'c')
export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return 'c' + id
}

export function now(): string {
  return new Date().toISOString()
}

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// ===== Types =====
type WhereClause = Record<string, any>
type SelectClause = Record<string, boolean>
type IncludeClause = Record<string, any>
type OrderByClause = Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[]
type FindManyArgs = {
  where?: WhereClause
  select?: SelectClause
  include?: IncludeClause
  orderBy?: OrderByClause
  take?: number
  skip?: number
  cursor?: Record<string, any>
  distinct?: string | string[]
}
type FindUniqueArgs = {
  where: Record<string, any>
  select?: SelectClause
  include?: IncludeClause
}
type CreateArgs = {
  data: Record<string, any>
  include?: IncludeClause
}
type CreateManyArgs = {
  data: Record<string, any> | Record<string, any>[]
  skipDuplicates?: boolean
}
type UpdateArgs = {
  where: Record<string, any>
  data: Record<string, any>
  include?: IncludeClause
}
type UpdateManyArgs = {
  where: WhereClause
  data: Record<string, any>
}
type DeleteArgs = {
  where: Record<string, any>
  include?: IncludeClause
}
type DeleteManyArgs = {
  where?: WhereClause
}
type CountArgs = {
  where?: WhereClause
}
type AggregateArgs = {
  where?: WhereClause
  _sum?: Record<string, true>
  _count?: boolean | Record<string, true>
  _avg?: Record<string, true>
  _min?: Record<string, true>
  _max?: Record<string, true>
}

// ===== Helpers =====

// Convert Prisma-style where clause to Supabase filter
function buildFilter(where: WhereClause | undefined): Record<string, any> {
  if (!where || Object.keys(where).length === 0) return {}
  
  const filter: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' && Array.isArray(value)) {
      // AND is implicit in Supabase - just merge all
      for (const v of value) {
        Object.assign(filter, buildFilter(v))
      }
    } else if (key === 'OR' && Array.isArray(value)) {
      // OR needs special handling
      filter._or = value.map((v) => buildFilter(v))
    } else if (value === null) {
      filter[key] = null
    } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      // Operator object: { equals, in, contains, gt, lt, gte, lte, startsWith, endsWith }
      const ops = value as any
      
      // Handle nested relations (e.g., user: { id: 'xxx' })
      if (key === 'user' || key === 'actor' || key === 'recipient' || key === 'follower' || key === 'followee' || key === 'reporter' || key === 'voiceNote' || key === 'prompt' || key === 'comment' || key === 'parent') {
        // For nested, we use the foreign key column directly
        // Try common FK column names
        if (ops.id) {
          const fkCol = key === 'actor' ? 'actorId' : 
                        key === 'recipient' ? 'recipientId' :
                        key === 'follower' ? 'followerId' :
                        key === 'followee' ? 'followeeId' :
                        key === 'reporter' ? 'reporterId' :
                        key === 'voiceNote' ? 'voiceNoteId' :
                        key === 'parent' ? 'parentId' :
                        key === 'prompt' ? 'promptId' :
                        key === 'comment' ? 'commentId' :
                        `${key}Id`
          filter[fkCol] = ops.id
        }
        continue
      }
      
      if (ops.equals !== undefined) {
        filter[key] = ops.equals
      }
      if (ops.in && Array.isArray(ops.in)) {
        // Mark for special handling - will be set as array
        filter[`${key}`] = ops.in  // array value triggers query.in() in applyFilter
      }
      if (ops.contains !== undefined) {
        filter[`${key}`] = `ilike.%${ops.contains}%`
      }
      if (ops.startsWith !== undefined) {
        filter[`${key}`] = `ilike.${ops.startsWith}%`
      }
      if (ops.endsWith !== undefined) {
        filter[`${key}`] = `ilike.%${ops.endsWith}`
      }
      if (ops.gt !== undefined) {
        const v = ops.gt instanceof Date ? ops.gt.toISOString() : ops.gt
        filter[`${key}`] = `gt.${v}`
      }
      if (ops.gte !== undefined) {
        const v = ops.gte instanceof Date ? ops.gte.toISOString() : ops.gte
        filter[`${key}`] = `gte.${v}`
      }
      if (ops.lt !== undefined) {
        const v = ops.lt instanceof Date ? ops.lt.toISOString() : ops.lt
        filter[`${key}`] = `lt.${v}`
      }
      if (ops.lte !== undefined) {
        const v = ops.lte instanceof Date ? ops.lte.toISOString() : ops.lte
        filter[`${key}`] = `lte.${v}`
      }
    } else {
      // Direct equality
      filter[key] = value
    }
  }
  
  return filter
}

// Apply filter to a Supabase query
function applyFilter(query: any, filter: Record<string, any>): any {
  for (const [key, value] of Object.entries(filter)) {
    if (key === '_or' && Array.isArray(value)) {
      // Supabase or() syntax: query.or('col1.eq.val1,col2.eq.val2')
      const orStrings: string[] = []
      for (const f of value) {
        for (const [k, v] of Object.entries(f)) {
          if (v === null) {
            orStrings.push(`${k}.is.null`)
          } else if (typeof v === 'string' && (
            v.startsWith('ilike.') || v.startsWith('in.') ||
            v.startsWith('gt.') || v.startsWith('lt.') ||
            v.startsWith('gte.') || v.startsWith('lte.')
          )) {
            // It's already an operator string
            orStrings.push(`${k}.${v}`)
          } else if (Array.isArray(v)) {
            // IN clause: col.in.(val1,val2)
            orStrings.push(`${k}.in.(${v.map((x) => String(x)).join(',')})`)
          } else {
            // Plain equality
            orStrings.push(`${k}.eq.${v}`)
          }
        }
      }
      if (orStrings.length > 0) {
        query = query.or(orStrings.join(','))
      }
    } else if (value === null) {
      query = query.is(key, null)
    } else if (typeof value === 'string' && (
      value.startsWith('ilike.') || value.startsWith('in.') ||
      value.startsWith('gt.') || value.startsWith('lt.') ||
      value.startsWith('gte.') || value.startsWith('lte.') ||
      value.startsWith('eq.')
    )) {
      const [op, ...rest] = value.split('.')
      const val = rest.join('.')
      if (op === 'ilike') query = query.ilike(key, val)
      else if (op === 'in') query = query.in(key, val.replace(/^\(/, '').replace(/\)$/, '').split(','))
      else if (op === 'gt') query = query.gt(key, val)
      else if (op === 'lt') query = query.lt(key, val)
      else if (op === 'gte') query = query.gte(key, val)
      else if (op === 'lte') query = query.lte(key, val)
      else if (op === 'eq') query = query.eq(key, val)
    } else if (Array.isArray(value)) {
      // Array value = IN clause
      query = query.in(key, value)
    } else {
      query = query.eq(key, value)
    }
  }
  return query
}

// Convert orderBy to Supabase order format
function applyOrderBy(query: any, orderBy: OrderByClause | undefined): any {
  if (!orderBy) return query
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
  for (const o of orders) {
    for (const [col, dir] of Object.entries(o)) {
      query = query.order(col, { ascending: dir === 'asc' })
    }
  }
  return query
}

// Convert Prisma select clause to Supabase select format
function buildSelect(select: SelectClause | undefined, include: IncludeClause | undefined, tableName?: string): string {
  if (select) {
    return Object.keys(select).filter((k) => select[k]).join(',')
  }
  if (include) {
    // Map relation names to their actual table names (PostgREST is case-sensitive)
    const relationToTable: Record<string, string> = {
      user: 'User',
      actor: 'User',
      recipient: 'User',
      follower: 'User',
      followee: 'User',
      reporter: 'User',
      voiceNote: 'VoiceNote',
      voiceNotes: 'VoiceNote',
      prompt: 'Prompt',
      prompts: 'Prompt',
      likes: 'Like',
      reports: 'Report',
      comments: 'Comment',
      bookmarks: 'Bookmark',
      replies: 'Comment',
      parent: 'Comment',
      sessions: 'Session',
      followers: 'Follow',
      following: 'Follow',
      donations: 'SupportDonation',
      notificationsReceived: 'Notification',
      notificationsTriggered: 'Notification',
    }
    const cols = ['*']
    for (const [key, val] of Object.entries(include)) {
      if (val) {
        // Skip _count - handled separately
        if (key === '_count') continue
        const tableName = relationToTable[key] || key
        cols.push(`${tableName}(*)`)
      }
    }
    return cols.join(',')
  }
  return '*'
}

// Helper: count related records for a list of parent records
async function fetchCounts(
  parentTable: string,
  parentIds: string[],
  countConfig: Record<string, boolean>,
  fkColumnMap: Record<string, string>
): Promise<Record<string, Record<string, number>>> {
  const result: Record<string, Record<string, number>> = {}
  if (parentIds.length === 0 || !countConfig) return result
  
  for (const [relationName, enabled] of Object.entries(countConfig)) {
    if (!enabled) continue
    const fkCol = fkColumnMap[relationName]
    if (!fkCol) continue
    
    const relatedTableMap: Record<string, string> = {
      likes: 'Like',
      comments: 'Comment',
      bookmarks: 'Bookmark',
      reports: 'Report',
      voiceNotes: 'VoiceNote',
      replies: 'Comment',
      followers: 'Follow',
      following: 'Follow',
      sessions: 'Session',
      prompts: 'Prompt',
      donations: 'SupportDonation',
    }
    const relatedTable = relatedTableMap[relationName]
    if (!relatedTable) continue
    
    const { data, error } = await supabase
      .from(relatedTable)
      .select(fkCol)
      .in(fkCol, parentIds)
    
    if (error) continue
    
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      const parentId = row[fkCol]
      if (parentId) {
        counts[parentId] = (counts[parentId] || 0) + 1
      }
    }
    
    for (const parentId of parentIds) {
      if (!result[parentId]) result[parentId] = {}
      result[parentId][relationName] = counts[parentId] || 0
    }
  }
  
  return result
}

// Handle include (relations) by fetching separately if needed
async function applyIncludePostFetch(table: string, records: any[], include: IncludeClause | undefined) {
  if (!include || records.length === 0) return records
  
  // Handle _count specially
  const countConfig = include._count as any
  if (countConfig && typeof countConfig === 'object' && countConfig.select) {
    const parentIds = records.map((r) => r.id).filter(Boolean)
    
    // Map relation name to FK column
    const fkColumnMap: Record<string, string> = {
      likes: 'voiceNoteId',
      comments: 'voiceNoteId',
      bookmarks: 'voiceNoteId',
      reports: 'voiceNoteId',
      voiceNotes: 'userId',
      replies: 'parentId',
      followers: 'followeeId',
      following: 'followerId',
      sessions: 'userId',
      prompts: 'promptId',  // not really
      donations: 'userId',
    }
    
    const counts = await fetchCounts(table, parentIds, countConfig.select, fkColumnMap)
    
    for (const record of records) {
      if (record.id) {
        record._count = counts[record.id] || {}
      }
    }
  }
  
  // Relations mapping for actual includes (not _count)
  const relationConfig: Record<string, { fk: string; table: string; isList: boolean }> = {
    user: { fk: 'userId', table: 'User', isList: false },
    actor: { fk: 'actorId', table: 'User', isList: false },
    recipient: { fk: 'recipientId', table: 'User', isList: false },
    follower: { fk: 'followerId', table: 'User', isList: false },
    followee: { fk: 'followeeId', table: 'User', isList: false },
    reporter: { fk: 'reporterId', table: 'User', isList: false },
    voiceNote: { fk: 'voiceNoteId', table: 'VoiceNote', isList: false },
    voiceNotes: { fk: 'userId', table: 'VoiceNote', isList: true },
    prompt: { fk: 'promptId', table: 'Prompt', isList: false },
    prompts: { fk: '', table: 'Prompt', isList: true },
    likes: { fk: 'voiceNoteId', table: 'Like', isList: true },
    reports: { fk: 'voiceNoteId', table: 'Report', isList: true },
    comments: { fk: 'voiceNoteId', table: 'Comment', isList: true },
    bookmarks: { fk: 'voiceNoteId', table: 'Bookmark', isList: true },
    replies: { fk: 'parentId', table: 'Comment', isList: true },
    parent: { fk: 'parentId', table: 'Comment', isList: false },
    sessions: { fk: 'userId', table: 'Session', isList: true },
    followers: { fk: 'followeeId', table: 'Follow', isList: true },
    following: { fk: 'followerId', table: 'Follow', isList: true },
    donations: { fk: 'userId', table: 'SupportDonation', isList: true },
    notificationsReceived: { fk: 'recipientId', table: 'Notification', isList: true },
    notificationsTriggered: { fk: 'actorId', table: 'Notification', isList: true },
  }
  
  for (const [relName, includeVal] of Object.entries(include)) {
    if (!includeVal || relName === '_count') continue
    const config = relationConfig[relName]
    if (!config) continue
    
    // For single-record relations (belongs-to), fetch by FK
    if (!config.isList) {
      const fkCol = config.fk
      const fkValues = records.map((r) => r[fkCol]).filter(Boolean)
      if (fkValues.length === 0) continue
      
      const { data: related } = await supabase
        .from(config.table)
        .select('*')
        .in('id', [...new Set(fkValues)])
      
      const relatedMap = new Map((related || []).map((r: any) => [r.id, r]))
      for (const record of records) {
        if (record[fkCol]) {
          record[relName] = relatedMap.get(record[fkCol]) || null
        }
      }
    }
    // For has-many relations, we skip post-fetch (too complex for our use case)
  }
  
  return records
}

// ===== Table handler factory =====
// Returns `any` types to avoid TypeScript friction with Prisma-style queries
function createTableHandler(tableName: string): any {
  return {
    async findUnique(args: FindUniqueArgs) {
      let query = supabase.from(tableName).select(buildSelect(args.select, args.include))
      const filter = buildFilter(args.where)
      query = applyFilter(query, filter)
      query = query.limit(1)
      const { data, error } = await query
      if (error) throw new Error(`[db.${tableName}.findUnique] ${error.message}`)
      const record = data?.[0] || null
      if (record && args.include) {
        await applyIncludePostFetch(tableName, [record], args.include)
      }
      return record
    },
    
    async findFirst(args: FindManyArgs = {}) {
      let query = supabase.from(tableName).select(buildSelect(args.select, args.include))
      const filter = buildFilter(args.where)
      query = applyFilter(query, filter)
      query = applyOrderBy(query, args.orderBy)
      if (args.take !== undefined && args.take < 0) {
        // Negative take means "last N" - we need to reverse order
        query = query.limit(Math.abs(args.take))
      } else {
        query = query.limit(args.take ?? 1)
      }
      const { data, error } = await query
      if (error) throw new Error(`[db.${tableName}.findFirst] ${error.message}`)
      const record = data?.[0] || null
      if (record && args.include) {
        await applyIncludePostFetch(tableName, [record], args.include)
      }
      return record
    },
    
    async findMany(args: FindManyArgs = {}) {
      let query = supabase.from(tableName).select(buildSelect(args.select, args.include))
      const filter = buildFilter(args.where)
      query = applyFilter(query, filter)
      query = applyOrderBy(query, args.orderBy)
      
      if (args.skip) query = query.range(args.skip, args.skip + (args.take ?? 100) - 1)
      else if (args.take) query = query.limit(args.take)
      else query = query.limit(1000) // default limit
      
      const { data, error } = await query
      if (error) throw new Error(`[db.${tableName}.findMany] ${error.message}`)
      let records = data || []
      if (args.include && records.length > 0) {
        records = await applyIncludePostFetch(tableName, records, args.include)
      }
      return records
    },
    
    async create(args: CreateArgs) {
      // Auto-generate id if not provided (Prisma's @default(cuid()) behavior)
      const data = { ...args.data }
      if (!data.id) {
        data.id = generateId()
      }
      // Auto-set createdAt/updatedAt if not provided AND table has these columns
      // Session table doesn't have updatedAt, so we skip it for tables without it
      const tablesWithoutUpdatedAt = ['Session', 'Follow', 'Like', 'Comment', 'Bookmark', 'Report', 'Notification', 'SupportDonation', 'Post', 'PostLike', 'PostComment', 'Friendship', 'Message', 'Block', 'VoiceStory', 'VoiceStoryView', 'VoiceCircle', 'VoiceCircleMember', 'ProfileView', 'VoiceDraft', 'CommentLike', 'MuteWord']
      const nowIso = new Date().toISOString()
      if (!data.createdAt) data.createdAt = nowIso
      if (!data.updatedAt && !tablesWithoutUpdatedAt.includes(tableName)) {
        data.updatedAt = nowIso
      } else if (tablesWithoutUpdatedAt.includes(tableName)) {
        // Remove updatedAt if it was set (table doesn't have it)
        delete data.updatedAt
      }
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single()
      if (error) throw new Error(`[db.${tableName}.create] ${error.message}`)
      if (args.include && result) {
        await applyIncludePostFetch(tableName, [result], args.include)
      }
      return result
    },
    
    async createMany(args: CreateManyArgs) {
      const dataArrayRaw = Array.isArray(args.data) ? args.data : [args.data]
      // Auto-generate id for each
      const dataArray = dataArrayRaw.map((d: any) => {
        if (!d.id) {
          return { ...d, id: generateId() }
        }
        return d
      })
      const { data, error } = await supabase
        .from(tableName)
        .insert(dataArray)
        .select()
      if (error) throw new Error(`[db.${tableName}.createMany] ${error.message}`)
      return { count: data?.length || 0 }
    },
    
    async upsert(args: any) {
      // Prisma upsert syntax: { where: {...}, create: {...}, update: {...} }
      const where = args.where || {}
      const createData = { ...(args.create || args.data || {}) }
      if (!createData.id) {
        createData.id = generateId()
      }
      const updateData = args.update || args.data || {}
      
      // Try to find existing record
      const { data: existing } = await supabase
        .from(tableName)
        .select('*')
        .match(where)
        .limit(1)
      
      if (existing && existing.length > 0) {
        // Update existing
        const { data, error } = await supabase
          .from(tableName)
          .update(updateData)
          .match(where)
          .select()
          .single()
        if (error) throw new Error(`[db.${tableName}.upsert.update] ${error.message}`)
        if (args.include && data) {
          await applyIncludePostFetch(tableName, [data], args.include)
        }
        return data
      } else {
        // Insert new
        const { data, error } = await supabase
          .from(tableName)
          .insert(createData)
          .select()
          .single()
        if (error) throw new Error(`[db.${tableName}.upsert.insert] ${error.message}`)
        if (args.include && data) {
          await applyIncludePostFetch(tableName, [data], args.include)
        }
        return data
      }
    },
    
    async update(args: UpdateArgs) {
      // Build filter from where
      const filter = buildFilter(args.where)
      // Auto-update updatedAt if applicable (only for tables that have it)
      const tablesWithoutUpdatedAt = ['Session', 'Follow', 'Like', 'Comment', 'Bookmark', 'Report', 'Notification', 'SupportDonation', 'Post', 'PostLike', 'PostComment', 'Friendship', 'Message', 'Block', 'VoiceStory', 'VoiceStoryView', 'VoiceCircle', 'VoiceCircleMember', 'ProfileView', 'VoiceDraft', 'CommentLike', 'MuteWord']
      const updateData = { ...args.data }
      if (!tablesWithoutUpdatedAt.includes(tableName)) {
        if (!updateData.updatedAt) updateData.updatedAt = new Date().toISOString()
      } else {
        delete updateData.updatedAt
      }
      
      // First find the record to update (for unique constraint)
      const { data: existing, error: findErr } = await supabase
        .from(tableName)
        .select('*')
        .match(filter)
        .limit(1)
      
      if (findErr) throw new Error(`[db.${tableName}.update.find] ${findErr.message}`)
      if (!existing || existing.length === 0) {
        throw new Error(`[db.${tableName}.update] Record not found`)
      }
      
      const { data: updatedRecord, error } = await supabase
        .from(tableName)
        .update(updateData)
        .match(filter)
        .select()
        .single()
      if (error) throw new Error(`[db.${tableName}.update] ${error.message}`)
      if (args.include && updatedRecord) {
        await applyIncludePostFetch(tableName, [updatedRecord], args.include)
      }
      return updatedRecord
    },
    
    async updateMany(args: UpdateManyArgs) {
      const filter = buildFilter(args.where)
      let query = supabase.from(tableName).update(args.data)
      query = applyFilter(query, filter)
      const { data, error } = await query.select()
      if (error) throw new Error(`[db.${tableName}.updateMany] ${error.message}`)
      return { count: data?.length || 0 }
    },
    
    async delete(args: DeleteArgs) {
      const filter = buildFilter(args.where)
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .match(filter)
        .select()
        .single()
      if (error) throw new Error(`[db.${tableName}.delete] ${error.message}`)
      if (args.include && data) {
        await applyIncludePostFetch(tableName, [data], args.include)
      }
      return data
    },
    
    async deleteMany(args: DeleteManyArgs = {}) {
      const filter = buildFilter(args.where)
      let query = supabase.from(tableName).delete()
      query = applyFilter(query, filter)
      const { data, error } = await query.select()
      if (error) throw new Error(`[db.${tableName}.deleteMany] ${error.message}`)
      return { count: data?.length || 0 }
    },
    
    async count(args: CountArgs = {}) {
      const filter = buildFilter(args.where)
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true })
      query = applyFilter(query, filter)
      const { count, error } = await query
      if (error) throw new Error(`[db.${tableName}.count] ${error.message}`)
      return count || 0
    },
    
    async aggregate(args: AggregateArgs) {
      // For aggregate, we fetch all matching records and compute in JS
      const filter = buildFilter(args.where)
      let query = supabase.from(tableName).select('*')
      query = applyFilter(query, filter)
      const { data, error } = await query
      if (error) throw new Error(`[db.${tableName}.aggregate] ${error.message}`)
      
      const records = data || []
      const result: any = {}
      
      if (args._sum) {
        result._sum = {}
        for (const col of Object.keys(args._sum)) {
          result._sum[col] = records.reduce((sum, r) => sum + (Number(r[col]) || 0), 0)
        }
      }
      if (args._count === true) {
        result._count = records.length
      } else if (typeof args._count === 'object' && args._count !== null) {
        result._count = {}
        for (const col of Object.keys(args._count)) {
          result._count[col] = records.filter((r) => r[col] != null).length
        }
      }
      if (args._avg) {
        result._avg = {}
        for (const col of Object.keys(args._avg)) {
          const vals = records.map((r) => Number(r[col])).filter((v) => !isNaN(v))
          result._avg[col] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
        }
      }
      if (args._min) {
        result._min = {}
        for (const col of Object.keys(args._min)) {
          const vals = records.map((r) => r[col]).filter((v) => v != null)
          result._min[col] = vals.length > 0 ? vals.reduce((m, v) => (v < m ? v : m), vals[0]) : null
        }
      }
      if (args._max) {
        result._max = {}
        for (const col of Object.keys(args._max)) {
          const vals = records.map((r) => r[col]).filter((v) => v != null)
          result._max[col] = vals.length > 0 ? vals.reduce((m, v) => (v > m ? v : m), vals[0]) : null
        }
      }
      
      return result
    },
  }
}

// ===== Export the db object =====
export const db = {
  user: createTableHandler('User'),
  session: createTableHandler('Session'),
  prompt: createTableHandler('Prompt'),
  voiceNote: createTableHandler('VoiceNote'),
  follow: createTableHandler('Follow'),
  like: createTableHandler('Like'),
  comment: createTableHandler('Comment'),
  bookmark: createTableHandler('Bookmark'),
  report: createTableHandler('Report'),
  notification: createTableHandler('Notification'),
  supportDonation: createTableHandler('SupportDonation'),
  // Posts system
  post: createTableHandler('Post'),
  postLike: createTableHandler('PostLike'),
  postComment: createTableHandler('PostComment'),
  // Social system
  friendship: createTableHandler('Friendship'),
  message: createTableHandler('Message'),
  block: createTableHandler('Block'),
  pushSubscription: createTableHandler('PushSubscription'),
  // Voice Stories (24h auto-expire)
  voiceStory: createTableHandler('VoiceStory'),
  voiceStoryView: createTableHandler('VoiceStoryView'),
  // Voice Circles (permanent voice groups)
  voiceCircle: createTableHandler('VoiceCircle'),
  voiceCircleMember: createTableHandler('VoiceCircleMember'),
  // Profile views tracking
  profileView: createTableHandler('ProfileView'),
  // Voice note drafts (unsaved recordings)
  voiceDraft: createTableHandler('VoiceDraft'),
  // Comment likes
  commentLike: createTableHandler('CommentLike'),
  // Mute words (content filtering)
  muteWord: createTableHandler('MuteWord'),
  // For raw queries (used by migrate endpoint)
  $executeRawUnsafe: async (sql: string) => {
    // Use Supabase rpc to execute raw SQL
    // We need a function defined in Supabase for this, OR we use the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/sada-db`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sada-token': process.env.SADA_API_TOKEN || 'sada-internal-token-2026',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown' }))
      throw new Error(`[db.$executeRawUnsafe] ${err.error || response.statusText}`)
    }
    const result = await response.json()
    return result.count || 0
  },
  $queryRawUnsafe: async (sql: string) => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/sada-db`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sada-token': process.env.SADA_API_TOKEN || 'sada-internal-token-2026',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown' }))
      throw new Error(`[db.$queryRawUnsafe] ${err.error || response.statusText}`)
    }
    const result = await response.json()
    return result.rows || []
  },
}

// Re-export supabase client for direct use if needed
export { supabase }

