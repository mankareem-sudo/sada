#!/usr/bin/env python3
"""
Sada v2 migration runner — applies multi-feature migration to Supabase.

Adds support for:
  - Link previews (Post.linkUrl, linkTitle, linkDescription, linkImage, linkFetchedAt)
  - Polls (Post.pollQuestion, pollOptions, pollExpiresAt, pollAllowMultiple; PollVote table)
  - Comment pinning/hiding (PostComment.isPinned, isHidden, editedAt)
  - Cover photos (User.coverUrl, isVerified)

Run with:
  python3 scripts/run_migration_v2.py
"""
import os
import sys
from pathlib import Path

# Try to load .env from project root
ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / '.env.local'
if not ENV_FILE.exists():
    ENV_FILE = ROOT / '.env'
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        if '=' in line and not line.strip().startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env")
    sys.exit(1)

SQL_FILE = ROOT / 'prisma' / 'migration_v2_features.sql'
if not SQL_FILE.exists():
    print(f"ERROR: SQL file not found: {SQL_FILE}")
    sys.exit(1)

SQL = SQL_FILE.read_text()

print(f"Applying Sada v2 migration to: {SUPABASE_URL}")
print(f"SQL file: {SQL_FILE}")
print("=" * 60)

import urllib.request
import json

url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
# Supabase doesn't expose a generic exec_sql via REST by default,
# so we use the /pg endpoint via service role (requires pg_meta enabled)
# Fallback: execute via the SQL editor endpoint

# Use the database connection directly
DB_URL = os.environ.get('DATABASE_URL') or os.environ.get('DIRECT_URL')
if DB_URL:
    # Try psycopg
    try:
        import psycopg
        print(f"Connecting via DATABASE_URL...")
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(SQL)
                conn.commit()
        print("✓ Migration applied successfully via psycopg")
        sys.exit(0)
    except ImportError:
        pass
    try:
        import psycopg2
        print(f"Connecting via DATABASE_URL (psycopg2)...")
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.close()
        print("✓ Migration applied successfully via psycopg2")
        sys.exit(0)
    except ImportError:
        pass

# Fallback: print SQL for manual execution
print("=" * 60)
print("⚠ Could not auto-execute SQL (no psycopg installed, no DATABASE_URL).")
print("Please run this SQL manually in Supabase Dashboard → SQL Editor:\n")
print(SQL)
