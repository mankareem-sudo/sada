"""Run the Sada schema SQL on Supabase via pg_meta API.
Uses subprocess + curl to avoid urllib encoding issues.

Set SUPABASE_PAT env var before running:
  export SUPABASE_PAT="sbp_your_token_here"
"""
import subprocess
import json
import time
import os

PAT = os.environ.get("SUPABASE_PAT", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "ljvpddwxkzlqnvevylic")
SQL_FILE = os.environ.get("SADA_SQL_FILE", "/home/z/my-project/download/sada_schema.sql")
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

if not PAT:
    print("ERROR: SUPABASE_PAT environment variable not set")
    print("Set it with: export SUPABASE_PAT='sbp_your_token_here'")
    exit(1)

with open(SQL_FILE, "r", encoding="utf-8") as f:
    schema_sql = f.read()


def split_sql(sql: str):
    """Split SQL into individual statements, respecting quotes and parens."""
    # Remove comment-only lines first
    lines = sql.split('\n')
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('--'):
            continue
        cleaned.append(line)
    sql = '\n'.join(cleaned)
    
    statements = []
    current = []
    in_single = False
    in_double = False
    paren_depth = 0
    
    i = 0
    while i < len(sql):
        c = sql[i]
        
        # Handle escape sequences
        if c == '\\' and i + 1 < len(sql):
            current.append(c)
            current.append(sql[i+1])
            i += 2
            continue
        
        if c == "'" and not in_double:
            in_single = not in_single
        elif c == '"' and not in_single:
            in_double = not in_double
        elif c == '(' and not in_single and not in_double:
            paren_depth += 1
        elif c == ')' and not in_single and not in_double:
            paren_depth -= 1
        elif c == ';' and not in_single and not in_double and paren_depth == 0:
            stmt = ''.join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
            i += 1
            continue
        
        current.append(c)
        i += 1
    
    stmt = ''.join(current).strip()
    if stmt:
        statements.append(stmt)
    return statements


def execute_query(query: str):
    """Execute a single SQL query via the pg_meta API using curl."""
    payload = json.dumps({"query": query})
    
    result = subprocess.run([
        "curl", "-s", "-w", "\n%{http_code}", "-X", "POST",
        "-H", f"Authorization: Bearer {PAT}",
        "-H", "Content-Type: application/json",
        "-d", payload,
        API_URL
    ], capture_output=True, text=True, timeout=60)
    
    output = result.stdout.strip()
    if not output:
        return 0, "", "empty response"
    
    # Split response body and HTTP code (last line)
    parts = output.rsplit('\n', 1)
    if len(parts) == 2:
        body, code_str = parts
        try:
            code = int(code_str.strip())
        except ValueError:
            return 0, output, "invalid status code"
        return code, body, None
    return 0, output, None


# Drop the test User table first (we created it earlier for testing)
print("Cleaning up test table...")
execute_query('DROP TABLE IF EXISTS "User" CASCADE;')
time.sleep(0.5)

statements = split_sql(schema_sql)
print(f"Found {len(statements)} SQL statements")
print("=" * 60)

success_count = 0
fail_count = 0
errors = []

for i, stmt in enumerate(statements, 1):
    first_line = stmt.strip().split('\n')[0][:70]
    print(f"[{i:2}/{len(statements)}] {first_line}...", end=" ", flush=True)
    
    code, body, err = execute_query(stmt)
    
    if code in (200, 201):
        success_count += 1
        print("OK")
    else:
        body_lower = (body or "").lower()
        if "already exists" in body_lower:
            success_count += 1
            print("EXISTS")
        elif "duplicate key" in body_lower:
            success_count += 1
            print("DUP")
        else:
            fail_count += 1
            err_msg = (body or err or "")[:120]
            errors.append({"stmt": first_line, "error": err_msg})
            print(f"FAIL [{code}]: {err_msg[:80]}")
    
    # Small delay to avoid rate limiting
    time.sleep(0.1)

print("=" * 60)
print(f"✓ Success: {success_count}/{len(statements)}")
print(f"✗ Failed: {fail_count}/{len(statements)}")

if errors:
    print("\nErrors (first 5):")
    for e in errors[:5]:
        print(f"  STMT: {e['stmt']}")
        print(f"  ERR:  {e['error']}")
        print()

# Verify tables
print("\n=== Verifying tables ===")
code, body, _ = execute_query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
)
if code in (200, 201):
    try:
        tables = json.loads(body)
        print(f"Tables in DB: {len(tables)}")
        for t in tables:
            print(f"  ✓ {t['table_name']}")
    except json.JSONDecodeError:
        print(f"Parse error: {body[:200]}")
else:
    print(f"Verify failed: {body[:200]}")

# Count prompts
print("\n=== Counting prompts ===")
code, body, _ = execute_query('SELECT COUNT(*) as count FROM "Prompt";')
if code in (200, 201):
    try:
        result = json.loads(body)
        print(f"Prompts in DB: {result[0]['count']}")
    except json.JSONDecodeError:
        print(f"Parse error: {body[:200]}")
else:
    print(f"Count failed: {body[:200]}")

print("\n=== Done ===")
