#!/bin/bash
rsync -av --exclude='venv' --exclude='node_modules' --exclude='__pycache__' --exclude='.git' \
  /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/ /home/nwasim/projects/ddn-kv-cache/ 2>&1 | grep -E '\.(py|tsx|ts)$'

fuser -k 5176/tcp 2>/dev/null
sleep 1
pm2 restart ddn-kvc-backend ddn-kvc-frontend
sleep 6
echo "=== BACKEND ===" && curl -s http://localhost:8002/health | python3 -c "import sys,json;d=json.load(sys.stdin);print('Status:', d['status'])"
echo "=== FRONTEND ===" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5176/
