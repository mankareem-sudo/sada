-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
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
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceNote" (
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
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceNoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
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
CREATE TABLE "Notification" (
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
CREATE TABLE "SupportDonation" (
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_date_key" ON "Prompt"("date");

-- CreateIndex
CREATE INDEX "VoiceNote_userId_idx" ON "VoiceNote"("userId");

-- CreateIndex
CREATE INDEX "VoiceNote_promptId_idx" ON "VoiceNote"("promptId");

-- CreateIndex
CREATE INDEX "VoiceNote_createdAt_idx" ON "VoiceNote"("createdAt");

-- CreateIndex
CREATE INDEX "Follow_followeeId_idx" ON "Follow"("followeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followeeId_key" ON "Follow"("followerId", "followeeId");

-- CreateIndex
CREATE INDEX "Like_voiceNoteId_idx" ON "Like"("voiceNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_voiceNoteId_key" ON "Like"("userId", "voiceNoteId");

-- CreateIndex
CREATE INDEX "Comment_voiceNoteId_idx" ON "Comment"("voiceNoteId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_voiceNoteId_key" ON "Bookmark"("userId", "voiceNoteId");

-- CreateIndex
CREATE INDEX "Report_voiceNoteId_idx" ON "Report"("voiceNoteId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "SupportDonation_createdAt_idx" ON "SupportDonation"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportDonation" ADD CONSTRAINT "SupportDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

