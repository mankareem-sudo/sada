-- Sada v2 — Multi-feature migration (Facebook-like enhancements)
-- Adds: link previews, polls, comment pinning/hiding, cover photos

BEGIN;

-- === 1. Post table enhancements ===
-- Add link preview, poll data, post audience scope
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "linkUrl" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "linkTitle" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "linkDescription" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "linkImage" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "linkFetchedAt" TIMESTAMP(3);

-- Poll columns (when type='poll')
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "pollQuestion" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "pollOptions" TEXT;        -- JSON: [{id, text}]
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "pollExpiresAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "pollAllowMultiple" BOOLEAN NOT NULL DEFAULT false;

-- Update Post type to allow 'poll' and 'link'
-- (Postgres doesn't enforce enum on TEXT, so no migration needed for type column)

-- === 2. PollVote table ===
CREATE TABLE IF NOT EXISTS "PollVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PollVote_postId_idx" ON "PollVote"("postId");
CREATE INDEX IF NOT EXISTS "PollVote_userId_idx" ON "PollVote"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_postId_userId_optionId_key" ON "PollVote"("postId", "userId", "optionId");

-- === 3. PostComment enhancements — pinning + hiding + edited ===
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PostComment_isPinned_idx" ON "PostComment"("isPinned") WHERE "isPinned" = true;

-- === 4. User enhancements — cover photo + verified badge ===
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationRequestedAt" TIMESTAMP(3);

-- === 5. Strike system — UserWarning already exists; add fields ===
ALTER TABLE "UserWarning" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "UserWarning" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

COMMIT;
