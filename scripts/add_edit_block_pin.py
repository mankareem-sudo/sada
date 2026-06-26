"""Add edit/block/pin columns + Block table."""
import subprocess, json, os

PAT = os.environ.get("SUPABASE_PAT", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "ljvpddwxkzlqnvevylic")
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

statements = [
    # Post: add isEdited, isPinned
    'ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false',
    'ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false',
    # PostComment: add isEdited
    'ALTER TABLE "PostComment" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false',
    # Block table
    '''CREATE TABLE IF NOT EXISTS "Block" (
        "id" TEXT NOT NULL,
        "blockerId" TEXT NOT NULL,
        "blockedId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
    )''',
    'CREATE UNIQUE INDEX IF NOT EXISTS "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId")',
    'CREATE INDEX IF NOT EXISTS "Block_blockerId_idx" ON "Block"("blockerId")',
]

for stmt in statements:
    short = stmt[:70].replace('\n', ' ')
    print(f"Executing: {short}...")
    payload = json.dumps({"query": stmt})
    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}", "-X", "POST",
        "-H", f"Authorization: Bearer {PAT}",
        "-H", "Content-Type: application/json",
        "-d", payload, API_URL
    ], capture_output=True, text=True, timeout=30)
    output = result.stdout.strip()
    parts = output.rsplit('\n', 1)
    code = parts[1] if len(parts) == 2 else "?"
    print(f"  {'OK' if code in ('200','201') else 'FAIL'}")
