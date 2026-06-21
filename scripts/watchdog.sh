#!/bin/bash
# Watchdog script to keep dev server running
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Starting dev server..."
    pkill -9 -f "next dev" 2>/dev/null
    sleep 1
    nohup npx next dev -p 3000 > /tmp/next.log 2>&1 &
    echo "[$(date)] Started PID $!"
    sleep 20
  fi
  sleep 5
done
