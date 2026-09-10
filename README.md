# DDN KV Cache Observatory

> **Live AI inference demo** showing how DDN Infinia Object Store eliminates LLM recomputation cost via real KV tensor offloading using vLLM + LMCache.

Built for GTC Berlin & field sales demos. Runs on a single RTX 5090 (WSL2 / Ubuntu 22.04).

---

## Architecture

```
Browser (localhost:5176)
        │
        ▼
  React Frontend  ──────────────────────────────────────────────────────────────┐
  (Vite · TypeScript)                                                           │
        │                                                                       │
        ▼                                                                       │
  FastAPI Backend (port 8002)                                                   │
        │                                                                       │
        ├── AIperf Service  ──────► aiperf CLI (benchmark traffic gun)          │
        │                                                                       │
        ├── KV Reuse Service ─────► S3 bucket scan (boto3)                      │
        │                                                                       │
        ├── vLLM Manager ─────────► vLLM (port 11000)                           │
        │                               │                                       │
        │                         LMCacheConnectorV1                            │
        │                               │                                       │
        │                         LMCache 0.5.4                                 │
        │                         ┌─────┴──────┐                               │
        │                         │ CPU DRAM   │  2 GB staging buffer           │
        │                         │ buffer     │                                │
        │                         └─────┬──────┘                               │
        │                               │ async write (~97ms)                   │
        │                               ▼                                       │
        └─────────────────► DDN Infinia S3  (192.168.147.129:8111)             │
                            Bucket: ddn-kv-cache-01                             │
                            ~832 MB KV tensors per prefix                      │
```

### 3-Layer KV Cache Hierarchy

| Layer | Technology | Speed | Persistence |
|---|---|---|---|
| ① GPU HBM | vLLM native prefix cache | ~1ms | Lost on restart |
| ② CPU DRAM | LMCache staging buffer (2GB) | ~10ms | Lost on restart |
| ③ DDN Infinia | S3 object store | ~97ms write / ~650ms load | ✅ Permanent |

---

## Services & Ports

| Service | Port | Technology |
|---|---|---|
| **KV Cache Observatory — Frontend** | **5176** | React + Vite + TypeScript |
| **KV Cache Observatory — Backend** | **8002** | FastAPI + Python 3.12 |
| **vLLM API** | **11000** | vLLM 0.26.0 + LMCacheConnectorV1 |
| DDN RAG Demo | 5174 / 8000 | — |
| DDN Semantic Search | 5175 / 8001 | — |
| Infinia OS | 5177 / 8003 | — |

---

## Hardware & Software Stack

| Component | Details |
|---|---|
| GPU | NVIDIA GeForce RTX 5090 — 24 GB GDDR7 |
| CUDA Driver | 592.02 (CUDA 13.1) |
| Platform | WSL2 · Ubuntu 22.04 |
| Python | 3.12.14 (dynamo-env venv) |
| vLLM | 0.26.0 |
| LMCache | 0.5.4-g3e11b8ed |
| Model | meta-llama/Llama-3.1-8B-Instruct |
| DDN Infinia | S3-compatible object store @ 192.168.147.129:8111 |

---

## PM2 Services

All services are managed via PM2 for persistent uptime across reboots.

```bash
# Start all services
pm2 start ecosystem.config.js

# Restore after machine restart
pm2 resurrect

# Check status
pm2 status

# View vLLM logs (LMCache activity)
pm2 logs ddn-vllm --lines 30
```

| PM2 Name | ID | Description |
|---|---|---|
| `ddn-kvc-frontend` | 9 | Vite dev server (port 5176) |
| `ddn-kvc-backend` | 8 | FastAPI backend (port 8002) |
| `ddn-vllm` | 13 | vLLM + LMCache (port 11000) |

---

## vLLM Launch Configuration

The vLLM process is launched via **`backend/start_vllm.sh`** (permanent — survives reboots).

Key flags:
```bash
# LMCache → DDN Infinia S3 backend
export LMCACHE_CONFIG_FILE=/home/nwasim/lmcache_infinia.yaml

# Disable FlashInfer JIT (avoids CUDA 13 header conflict on reboot)
export VLLM_USE_FLASHINFER_SAMPLER=0

# Launch with LMCacheConnectorV1
python3 -m vllm.entrypoints.openai.api_server \
  --model /home/nwasim/models/Llama-3.1-8B-Instruct \
  --served-model-name meta-llama/Llama-3.1-8B-Instruct \
  --enable-prefix-caching \
  --enforce-eager \
  --port 11000 \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.92 \
  --kv-transfer-config '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_both"}'
```

### LMCache Config (`/home/nwasim/lmcache_infinia.yaml`)

```yaml
chunk_size: 256              # tokens per KV chunk
local_cpu: true              # CPU DRAM staging tier (required for v0.5.4)
max_local_cpu_size: 2.0      # 2 GB CPU staging buffer
save_decode_cache: false     # prefill KV only
remote_url: "s3://ddn-kv-cache-01.192.168.147.129:8111"
remote_serde: "naive"        # binary serialization

extra_config:
  s3_region: "us-east-1"
  s3_use_path_style: true    # required for non-AWS S3 endpoints
  disable_tls: false
  s3_num_io_threads: 16
```

---

## Quick Start

### 1. After machine reboot

```bash
# In WSL (Ubuntu-22.04):
pm2 resurrect       # restores all saved PM2 processes
pm2 status          # verify all 3 KV Cache services are online
```

Then open: **http://localhost:5176**

### 2. Fresh setup (first time)

```bash
# Clone repo
git clone git@github.com:nasirwasim8/KV.Cache.git
cd KV.Cache

# Install backend dependencies
cd backend
/home/nwasim/dynamo-env/bin/pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Start all services via PM2
pm2 start ecosystem.config.js
pm2 save   # persist so pm2 resurrect works after reboot
```

---

## App Pages

### 🏠 Configuration
Set DDN Infinia credentials and connection details. Saved to `backend/kv_config.json`.

- Infinia endpoint: `https://192.168.147.129:8111`
- Bucket: `ddn-kv-cache-01`
- Access/Secret keys for S3 auth

### 💬 Chat Observatory
Side-by-side LLM chat showing cache HIT vs MISS in real time.
- Left panel: cold request (full recompute)
- Right panel: prefix cache hit (served from GPU HBM or Infinia)

### 📊 AIperf Benchmark
Live AI inference benchmarking via the `aiperf` CLI.

**What it tests:**
- Fires 20 requests at vLLM, all sharing a 4,000-token system prompt
- Measures TTFT (Time to First Token) — the most critical latency metric
- Shows p50 (warm/cached), p99 (cold), and the speedup multiplier

**Key metrics:**
| Metric | Meaning |
|---|---|
| TTFT Warm (avg/p50) | Cache HIT — GPU skips 4K token prefill |
| TTFT Cold (p99) | Cache MISS — full recompute from scratch |
| Speedup (Nx) | Cold ÷ Warm — typically 25–35× |

**Download results:** After each run, click **Download ZIP** to get all 5 result files (CSV, JSON, server metrics, log) bundled together.

### 🔬 KV Reuse Proof
Proves real KV tensor writes to DDN Infinia:
1. Runs a cold request → LMCache writes 832MB of KV tensors to Infinia async
2. Scans the Infinia bucket for newly created objects
3. Shows the exact object key, SHA-256 prefix hash, size, layer count

### ×N Prefix Multiplier
Simulates scaling — shows compute savings when N GPUs share one Infinia KV pool.

### 💰 ROI Calculator
Business case calculator — models GPU savings, cost avoidance, and payback period.

### 🏗️ Architecture
Interactive architecture diagrams with the KV tensor data flow.

---

## Demo Flow (Recommended Sequence)

```
1. Configuration  → verify Infinia connection (green "Connected")
2. AIperf         → run Quick preset (4K / c1 / 20 req)
                    → show 29× speedup: 3,100ms cold → 101ms warm
3. KV Reuse Proof → run cold + warm
                    → show objects written to Infinia bucket
                    → open Infinia bucket browser to see the 832MB KV file
4. Prefix Mult.   → show fleet-scale savings (100 GPUs, 1 pool)
5. ROI Calculator → plug in customer GPU count → show $ savings
```

---

## Infinia Write Flow (Critical for Demo)

**Why the bucket might look empty:**

LMCache uses a 3-tier hierarchy. Once KV tensors are in the GPU HBM prefix cache, LMCache serves from memory and does NOT write to Infinia again (already persisted).

**To force a fresh Infinia write:**
1. Click **"Clear Infinia Cache"** in the sidebar
   - This purges all S3 objects AND automatically restarts vLLM
   - Wait for the sidebar to show **"Ready — run benchmark for fresh Infinia writes"** (~90s)
2. Run the AIperf benchmark or KV Reuse Proof
3. LMCache will write fresh KV tensors to Infinia ✅

> **Note:** vLLM restart is required because LMCache's in-memory CPU buffer (2GB) retains KV tensors even after the S3 bucket is cleared. Restarting vLLM flushes both the GPU HBM and the CPU staging buffer.

---

## Troubleshooting

### vLLM shows "stopped" after machine restart

```bash
# Check what script PM2 is trying to run
pm2 show ddn-vllm | grep script

# Regenerate the startup script
cd /home/nwasim/projects/ddn-kv-cache/backend
pm2 restart ddn-vllm

# If still failing, check logs
pm2 logs ddn-vllm --lines 20
```

### LMCache not writing to Infinia

Verify LMCache initialized correctly:
```bash
pm2 logs ddn-vllm --lines 30 | grep -E 'LMCache INFO.*initialized|LMCache ERROR'
```
Expected: `LMCache initialized for role KVConnectorRole.SCHEDULER with version 0.5.4`

Check `LMCACHE_CONFIG_FILE` is set:
```bash
pm2 show ddn-vllm | grep LMCACHE
```

### FlashInfer JIT crash on reboot

The `start_vllm.sh` already sets `VLLM_USE_FLASHINFER_SAMPLER=0` to bypass this. If vLLM fails to start, check:
```bash
pm2 logs ddn-vllm --lines 10 | grep -i 'flash\|cuda\|error'
```

---

## Repository Structure

```
KV.Cache/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # All FastAPI endpoints
│   │   ├── services/
│   │   │   ├── aiperf_service.py  # AIperf benchmark runner
│   │   │   ├── kv_reuse_service.py # KV Reuse Proof logic
│   │   │   ├── kv_cache.py        # Infinia S3 operations (boto3)
│   │   │   └── vllm_manager.py    # vLLM start/stop control
│   │   └── core/config.py         # Settings & credentials
│   ├── start_vllm.sh              # ⭐ Permanent vLLM launch script (LMCache)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── AIperfBenchmark.tsx  # Live benchmark + download ZIP
│       │   ├── KVReuseProof.tsx     # Infinia write verification
│       │   ├── ChatObservatory.tsx  # Side-by-side chat demo
│       │   ├── PrefixMultiplier.tsx # Fleet-scale savings
│       │   ├── ROICalculator.tsx    # Business ROI calculator
│       │   ├── About.tsx            # Architecture page
│       │   └── TokenAnimation.tsx   # Token visualization
│       └── components/
│           ├── DemoSidebar.tsx      # Status + Clear Infinia Cache
│           └── VllmResourceGuard.tsx # Prevents GPU memory conflicts
├── ecosystem.config.js              # PM2 service definitions
├── configure.sh                     # Pre-configure Infinia credentials
├── lmcache_infinia.yaml             # LMCache S3 backend config (in ~/)
└── README.md
```

---

## Key Config Files (Outside Repo)

| File | Location | Purpose |
|---|---|---|
| `lmcache_infinia.yaml` | `~/lmcache_infinia.yaml` | LMCache → Infinia S3 connection |
| `kv_config.json` | `backend/kv_config.json` | Infinia credentials for backend API |
| `ecosystem.config.js` | repo root | PM2 service definitions |
| PM2 dump | `~/.pm2/dump.pm2` | Saved process list for `pm2 resurrect` |

---

## Branch Structure

| Branch | Purpose |
|---|---|
| `main` | Latest stable — all features merged |
| `feat/dynamo-aiperf` | Active development branch |
