"""Add new columns to User table for security and profile features."""
import subprocess
import json
import os

PAT = os.environ.get("SUPABASE_PAT", "")
if not PAT:
    print("ERROR: SUPABASE_PAT env var not set")
    exit(1)

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "ljvpddwxkzlqnvevylic")
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

statements = [
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT',
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT \'dark\'',
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT \'ar\'',
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetCode" TEXT',
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3)',
]

for stmt in statements:
    print(f"Executing: {stmt[:60]}...")
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
    if len(parts) == 2:
        body, code = parts
    else:
        code = "?"
        body = output
    print(f"  HTTP {code}: {body[:80]}")

# Verify
print("\n=== Verifying new columns ===")
verify = 'SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = \'User\' AND column_name IN (\'avatarUrl\', \'theme\', \'language\', \'passwordResetCode\', \'passwordResetExpires\') ORDER BY ordinal_position;'
payload = json.dumps({"query": verify})
result = subprocess.run([
    "curl", "-s", "-X", "POST",
    "-H", f"Authorization: Bearer {PAT}",
    "-H", "Content-Type: application/json",
    "-d", payload,
    API_URL
], capture_output=True, text=True, timeout=30)
print(result.stdout[:500])
