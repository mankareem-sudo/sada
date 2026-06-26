-- Sada v2.1 — Events migration
-- Adds group events with RSVP support

BEGIN;

-- === Event table ===
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "circleId" TEXT,                      -- nullable: events can be global or circle-scoped
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,                      -- physical location or online meeting URL
    "locationType" TEXT NOT NULL DEFAULT 'physical',  -- 'physical' | 'online' | 'hybrid'
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER,                   -- max attendees (NULL = unlimited)
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Event_circleId_idx" ON "Event"("circleId");
CREATE INDEX IF NOT EXISTS "Event_creatorId_idx" ON "Event"("creatorId");
CREATE INDEX IF NOT EXISTS "Event_startsAt_idx" ON "Event"("startsAt");

-- === EventRSVP table (user attendance status) ===
CREATE TABLE IF NOT EXISTS "EventRSVP" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,               -- 'going' | 'maybe' | 'not_going'
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EventRSVP_eventId_idx" ON "EventRSVP"("eventId");
CREATE INDEX IF NOT EXISTS "EventRSVP_userId_idx" ON "EventRSVP"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "EventRSVP_eventId_userId_key" ON "EventRSVP"("eventId", "userId");

COMMIT;
