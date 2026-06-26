"""Add Friendship, Message tables + privacy columns to Supabase."""
import subprocess
import json
import os

PAT = os.environ.get("SUPABASE_PAT", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "ljvpddwxkzlqnvevylic")
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

statements = [
    # === Friendship table ===
    '''CREATE TABLE IF NOT EXISTS "Friendship" (
        "id" TEXT NOT NULL,
        "requesterId" TEXT NOT NULL,
        "addresseeId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
    )''',
    
    # === Message table ===
    '''CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT NOT NULL,
        "senderId" TEXT NOT NULL,
        "receiverId" TEXT NOT NULL,
        "content" TEXT,
        "imageUrl" TEXT,
        "voiceData" TEXT,
        "voiceDuration" INTEGER,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
    )''',
    
    # === Add privacy column to Post ===
    'ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "privacy" TEXT NOT NULL DEFAULT \'public\'',
    
    # === Add profilePrivacy to User ===
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePrivacy" TEXT NOT NULL DEFAULT \'public\'',
    
    # === Indexes ===
    'CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId")',
    'CREATE INDEX IF NOT EXISTS "Friendship_addresseeId_idx" ON "Friendship"("addresseeId")',
    'CREATE INDEX IF NOT EXISTS "Friendship_status_idx" ON "Friendship"("status")',
    'CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId")',
    'CREATE INDEX IF NOT EXISTS "Message_receiverId_idx" ON "Message"("receiverId")',
    'CREATE INDEX IF NOT EXISTS "Message_read_idx" ON "Message"("read")',
    'CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt")',
]

for stmt in statements:
    short = stmt[:70].replace('\n', ' ')
    print(f"Executing: {short}...")
    payload = json.dumps({"query": stmt})
    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}", "-X", "POST",
        "-H", f"Authorization: Bearer {PAT}",
        "-H", "Content-Type: application/json",
        "-d", payload,
        API_URL
    ], capture_output=True, text=True, timeout=30)
    output = result.stdout.strip()
    parts = output.rsplit('\n', 1)
    code = parts[1] if len(parts) == 2 else "?"
    body = parts[0] if len(parts) == 2 else output
    status = "OK" if code in ("200", "201") else f"FAIL [{code}]: {body[:80]}"
    print(f"  {status}")

print("\n=== Verify ===")
verify = 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_name IN (\'Friendship\', \'Message\') ORDER BY table_name;'
payload = json.dumps({"query": verify})
result = subprocess.run([
    "curl", "-s", "-X", "POST",
    "-H", f"Authorization: Bearer {PAT}",
    "-H", "Content-Type: application/json",
    "-d", payload,
    API_URL
], capture_output=True, text=True, timeout=30)
print(result.stdout[:300])
