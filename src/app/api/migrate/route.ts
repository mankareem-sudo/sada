import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// The SQL to create all tables (generated from prisma schema)
// Read from prisma/schema.sql
const SCHEMA_SQL = `
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT '#8b5cf6',
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Prompt" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VoiceNote" (
    "id" TEXT NOT NULL,
    "promptId" TEXT,
    "userId" TEXT NOT NULL,
    "audioData" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/webm',
    "durationSec" INTEGER NOT NULL,
    "description" TEXT,
    "transcript" TEXT,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "voiceNoteId" TEXT,
    "commentId" TEXT,
    "text" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportDonation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL DEFAULT 'manual',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportDonation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "Prompt_date_key" ON "Prompt"("date");

CREATE INDEX IF NOT EXISTS "VoiceNote_userId_idx" ON "VoiceNote"("userId");
CREATE INDEX IF NOT EXISTS "VoiceNote_promptId_idx" ON "VoiceNote"("promptId");
CREATE INDEX IF NOT EXISTS "VoiceNote_createdAt_idx" ON "VoiceNote"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followeeId_key" ON "Follow"("followerId", "followeeId");
CREATE INDEX IF NOT EXISTS "Follow_followeeId_idx" ON "Follow"("followeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_voiceNoteId_key" ON "Like"("userId", "voiceNoteId");
CREATE INDEX IF NOT EXISTS "Like_voiceNoteId_idx" ON "Like"("voiceNoteId");

CREATE INDEX IF NOT EXISTS "Comment_voiceNoteId_idx" ON "Comment"("voiceNoteId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");

CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_userId_voiceNoteId_key" ON "Bookmark"("userId", "voiceNoteId");
CREATE INDEX IF NOT EXISTS "Bookmark_userId_idx" ON "Bookmark"("userId");

CREATE INDEX IF NOT EXISTS "Report_voiceNoteId_idx" ON "Report"("voiceNoteId");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");

CREATE INDEX IF NOT EXISTS "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "SupportDonation_createdAt_idx" ON "SupportDonation"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like" ADD CONSTRAINT "Like_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportDonation" ADD CONSTRAINT "SupportDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`

/**
 * POST /api/migrate?token=xxx
 * Executes the schema SQL on the database.
 * Used for first-time setup when prisma db push can't run in build env.
 */
export async function POST(req: NextRequest) {
  // Rate limit: very strict (3 per hour per IP)
  const rateCheck = checkRateLimit(req, 'makeAdmin')
  if (!rateCheck.allowed && rateCheck.response) {
    return rateCheck.response
  }
  
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || req.headers.get('x-setup-token')
  const expectedToken = process.env.SETUP_TOKEN || 'sada-initial-setup-2026'

  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized. Use ?token=sada-initial-setup-2026' },
      { status: 401 }
    )
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    statements: { total: 0, success: 0, failed: 0 },
    errors: [] as any[],
  }

  // Split SQL into statements (split on `;` at end of line)
  const statements = SCHEMA_SQL
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  results.statements.total = statements.length

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    try {
      await db.$executeRawUnsafe(stmt + ';')
      results.statements.success++
    } catch (e: any) {
      // Many "already exists" errors are expected on re-run
      const msg = e?.message || 'Unknown error'
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key')
      ) {
        results.statements.success++
      } else {
        results.statements.failed++
        results.errors.push({
          statement: stmt.slice(0, 80) + '...',
          error: msg.slice(0, 200),
        })
      }
    }
  }

  return NextResponse.json(results)
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/migrate',
    method: 'POST',
    usage: 'POST /api/migrate?token=sada-initial-setup-2026',
    description:
      'Creates all database tables. Safe to call multiple times (uses IF NOT EXISTS).',
  })
}
