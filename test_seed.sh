#!/bin/bash
rsync -av --exclude='venv' --exclude='node_modules' --exclude='__pycache__' --exclude='.git' \
  /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/backend/ /home/nwasim/projects/ddn-kv-cache/backend/ 2>&1 | grep '\.py$'

pm2 restart ddn-kvc-backend
sleep 5

echo "=== Testing seed endpoint ==="
curl -s -X POST http://localhost:8002/api/prefix/seed \
  -H "Content-Type: application/json" \
  -d '{"use_case":"legal"}' | python3 -m json.tool
