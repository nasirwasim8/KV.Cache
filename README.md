# BUILD.DDN:KVC — KV Cache Observatory

Live demo application showing how DDN Infinia Object Store eliminates LLM recomputation cost via real KV cache offloading.

## Ports (Isolated from other apps)

| App | Frontend | Backend |
|-----|----------|---------|
| DDN RAG Demo v2 | 5174 | 8000 |
| DDN Semantic Search | 5175 | 8001 |
| **KV Cache Observatory** | **5176** | **8002** |

## Quick Start (WSL Ubuntu-22.04)

```bash
bash /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/start.sh
```

Then open: **http://localhost:5176**

## Manual Start

```bash
# Backend (WSL)
cd /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/backend
venv/bin/uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# Frontend (WSL)
cd /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/frontend
npm run dev -- --host
```

## First Run Setup

1. Open http://localhost:5176
2. Go to **Configuration** tab
3. Enter DDN Infinia credentials:
   - Endpoint: `https://192.168.147.129:8111`
   - Bucket: `ddn-kv-cache-01`
4. Click **Save & Test Connection**
5. Click **Chat Observatory** → start chatting!

## How The Demo Works

**Chat Observatory:**
- LEFT panel (No Cache): Full conversation history sent to Ollama every turn
- RIGHT panel (With Infinia): Hash context → GET from Infinia → on HIT, serve from cache with real S3 latency shown
- Send same/similar message twice → RIGHT panel shows cache HIT with real `infinia_latency_ms`

**Prefix Multiplier:**
1. Choose a scenario (Legal / Healthcare / Telco)
2. Click **Seed Prefix** → generates KV context via Ollama → real S3 PUT to Infinia
3. Click **Run Request** → retrieves KV from Infinia → sends only question tokens to Ollama
4. Watch the waterfall build with real timing comparisons

## Architecture

```
React:5176 → FastAPI:8002 → InfiniaKVCacheManager (boto3 S3)
                          → OllamaClient (/api/generate + context)
                          ↕
              DDN INFINIA (kvcache/*.json objects)
              Ollama WSL (llama3.2:3b / RTX 5090)
```
