-- Voice Stories — auto-expires after 24 hours via application logic
-- See /api/stories endpoints for expiry handling

CREATE TABLE IF NOT EXISTS "VoiceStory" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "audioData" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "transcript" TEXT,
    "backgroundColor" TEXT DEFAULT '#8b5cf6',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "isExpired" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS "VoiceStory_userId_idx" ON "VoiceStory"("userId");
CREATE INDEX IF NOT EXISTS "VoiceStory_expiresAt_idx" ON "VoiceStory"("expiresAt");
CREATE INDEX IF NOT EXISTS "VoiceStory_isExpired_idx" ON "VoiceStory"("isExpired");

CREATE TABLE IF NOT EXISTS "VoiceStoryView" (
    "id" TEXT PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE("storyId", "userId")
);

CREATE INDEX IF NOT EXISTS "VoiceStoryView_storyId_idx" ON "VoiceStoryView"("storyId");
CREATE INDEX IF NOT EXISTS "VoiceStoryView_userId_idx" ON "VoiceStoryView"("userId");
