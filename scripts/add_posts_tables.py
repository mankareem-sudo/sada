"""Add Posts tables to Supabase."""
import subprocess
import json
import os

PAT = os.environ.get("SUPABASE_PAT", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "ljvpddwxkzlqnvevylic")
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

statements = [
    # Post table
    '''CREATE TABLE IF NOT EXISTS "Post" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'text',
        "content" TEXT,
        "imageUrl" TEXT,
        "voiceNoteId" TEXT,
        "plays" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
    )''',
    
    # PostLike table
    '''CREATE TABLE IF NOT EXISTS "PostLike" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
    )''',
    
    # PostComment table
    '''CREATE TABLE IF NOT EXISTS "PostComment" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "content" TEXT,
        "imageUrl" TEXT,
        "voiceData" TEXT,
        "voiceDuration" INTEGER,
        "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
    )''',
    
    # Indexes
    'CREATE INDEX IF NOT EXISTS "Post_userId_idx" ON "Post"("userId")',
    'CREATE INDEX IF NOT EXISTS "Post_createdAt_idx" ON "Post"("createdAt")',
    'CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_userId_postId_key" ON "PostLike"("userId", "postId")',
    'CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId")',
    'CREATE INDEX IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId")',
    'CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId")',
    'CREATE INDEX IF NOT EXISTS "PostComment_parentId_idx" ON "PostComment"("parentId")',
    
    # Foreign keys
    'ALTER TABLE "Post" ADD CONSTRAINT IF NOT EXISTS "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    'ALTER TABLE "PostLike" ADD CONSTRAINT IF NOT EXISTS "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    'ALTER TABLE "PostLike" ADD CONSTRAINT IF NOT EXISTS "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    'ALTER TABLE "PostComment" ADD CONSTRAINT IF NOT EXISTS "PostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    'ALTER TABLE "PostComment" ADD CONSTRAINT IF NOT EXISTS "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    'ALTER TABLE "PostComment" ADD CONSTRAINT IF NOT EXISTS "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE',
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

print("\n=== Verifying tables ===")
verify = 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_name LIKE \'Post%\' ORDER BY table_name;'
payload = json.dumps({"query": verify})
result = subprocess.run([
    "curl", "-s", "-X", "POST",
    "-H", f"Authorization: Bearer {PAT}",
    "-H", "Content-Type: application/json",
    "-d", payload,
    API_URL
], capture_output=True, text=True, timeout=30)
print(result.stdout[:300])
