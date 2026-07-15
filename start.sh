#!/bin/bash
# DDN KV Cache Observatory — Startup Script
# Starts backend (port 8002) and frontend (port 5176)
# Does NOT affect VSS (8001/5175) or RAG (8000/5174)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/mnt/c/DDN/AI-Dev/Projects/KV.Cahce"

echo "======================================================"
echo "  DDN KV Cache Observatory"
echo "  Backend  → http://localhost:8002"
echo "  Frontend → http://localhost:5176"
echo "======================================================"

# ── 1. Check Ollama ───────────────────────────────────────
echo ""
echo "Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "⚠️  Ollama not responding — starting it..."
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  sleep 3
fi
echo "✅ Ollama running"

# ── 2. Check model ────────────────────────────────────────
if ! ollama list 2>/dev/null | grep -q "llama3.2:3b"; then
  echo "📥 Pulling llama3.2:3b..."
  ollama pull llama3.2:3b
fi
echo "✅ llama3.2:3b ready"

# ── 3. Backend venv ───────────────────────────────────────
VENV="$PROJECT_DIR/backend/venv"
if [ ! -d "$VENV" ]; then
  echo "🐍 Creating Python venv..."
  python3 -m venv "$VENV"
fi

echo "📦 Installing backend deps..."
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r "$PROJECT_DIR/backend/requirements.txt"
echo "✅ Backend deps installed"

# ── 4. Start backend ──────────────────────────────────────
echo ""
echo "🚀 Starting backend on port 8002..."
cd "$PROJECT_DIR/backend"
nohup "$VENV/bin/uvicorn" main:app --host 0.0.0.0 --port 8002 --reload \
  > /tmp/kvc-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 2

# ── 5. Frontend ───────────────────────────────────────────
echo "🖥️  Starting frontend on port 5176..."
cd "$PROJECT_DIR/frontend"
nohup npm run dev -- --host > /tmp/kvc-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
sleep 3

# ── 6. Health check ───────────────────────────────────────
echo ""
echo "🔍 Health check..."
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
  echo "✅ Backend healthy: http://localhost:8002"
else
  echo "⚠️  Backend not ready yet — check /tmp/kvc-backend.log"
fi

echo ""
echo "======================================================"
echo "  App running at: http://localhost:5176"
echo "  API docs at:    http://localhost:8002/docs"
echo ""
echo "  Other apps (not affected):"
echo "  DDN RAG:     http://localhost:5174  (BE:8000)"
echo "  DDN VSS:     http://localhost:5175  (BE:8001)"
echo "======================================================"
echo ""
echo "Logs: tail -f /tmp/kvc-backend.log | /tmp/kvc-frontend.log"
echo "Stop: kill $BACKEND_PID $FRONTEND_PID"
