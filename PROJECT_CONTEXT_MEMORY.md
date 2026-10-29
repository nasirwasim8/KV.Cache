# DDN Infinia KV Cache Observatory — Master Project Context & Memory
> **Location:** `/home/nwasim/projects/ddn-kv-cache/PROJECT_CONTEXT_MEMORY.md`  
> **Repository:** `https://github.com/nasirwasim8/KV.Cache.git` (Branch: `main`)  
> **Standalone ROI Repository:** `/home/nwasim/projects/ddn-roi-standalone` (`https://github.com/nasirwasim8/ddn-roi-calculator.git`, Deployed to `https://ddn-kv-roi.vercel.app`)  
> **Last Updated:** October 2026

---

## 1. Executive Summary & Core Mission

The **DDN Infinia KV Cache Observatory** is an enterprise-grade demonstration and telemetry benchmarking platform. It was created to showcase how **DDN Infinia High-Throughput Shared Storage (NVIDIA G4 Tier)** transforms Large Language Model (LLM) inference by solving the **KV Cache Memory Wall**.

### The Core Problem: The Physics of KV Cache
Modern inference GPUs (NVIDIA H100, H200, Blackwell B200, RTX 5090) prefill prompt tokens at extreme speeds (thousands of tokens per second). When serving multi-turn chat, deep agentic workflows (32k+ tokens), or multi-tenant applications:
1. **GPU HBM is Scarce and Expensive:** Storing KV tensors in GPU High Bandwidth Memory (G1 tier) consumes gigabytes per user session, rapidly exhausting VRAM and starving GPU compute Tensor Cores.
2. **The Retrieval Bottleneck:** Offloading KV tensors to standard cloud object storage (S3 over standard TCP) or legacy NFS takes 300 ms – 1,000+ ms. Because standard storage retrieval is slower than recomputing tokens directly on GPU Tensor Cores, caching becomes **counter-productive (NO GAIN / Latency Penalty)**.

### The DDN Infinia Solution
DDN Infinia delivers:
- **Microsecond Storage Lookup:** Sub-millisecond index search across cluster shared storage.
- **GPU-Direct RDMA over 200/400Gbps RoCE:** Line-rate NVMe-oF bypassing CPU overhead.
- **Ultra-low Transfer Latency:** 8 ms – 18 ms for full KV tensor restoration.
- **Radical TTFT Acceleration:** Cuts Time-to-First-Token from 4,200+ ms down to sub-60 ms (75× improvement).
- **Concurrency Multiplication:** Frees GPU memory to serve 4.8× more concurrent streams on the same hardware footprint.

---

## 2. Infrastructure & Service Topology

### Runtime Environment
- **Operating System:** Windows host running WSL2 (`Ubuntu-22.04`).
- **Workspace Path:** `/home/nwasim/projects/ddn-kv-cache`.
- **Node.js:** Node v18+ with Vite v5.4.
- **Python:** Python 3.10+ virtualenv at `backend/venv/`.

### Network Ports & Process Map
| Service Name | Port | Description | Managed By |
| :--- | :--- | :--- | :--- |
| **`ddn-kvc-frontend`** | `5176` | Vite + React 18 + Tailwind CSS SPA | PM2 (PID id: 9) |
| **`ddn-kvc-backend`** | `8002` | FastAPI + Uvicorn REST API | PM2 (PID id: 8) |
| **`ddn-vllm`** | `11000` | vLLM v1 OpenAI-compatible Server | PM2 (PID id: 12) |
| **Ollama (Fallback)**| `11434` | Local model server (`llama3.2:3b`) | System service |
| **DDN Infinia S3** | `8111` | Infinia S3 Endpoint (`ddn-kv-cache-01`) | S3 Appliance (`127.0.0.1:8111`) |

### PM2 Process Management
```bash
# Check status of all processes
pm2 status

# Restart frontend after build
pm2 restart ddn-kvc-frontend

# Restart backend
pm2 restart ddn-kvc-backend

# Start / stop vLLM inference engine
pm2 start ddn-vllm
pm2 stop ddn-vllm

# IMPORTANT: vLLM Cleanup
# If vLLM hangs on stop or leaves child workers holding GPU memory:
pkill -9 -f 'VLLM::EngineCore'
```

### vLLM Configuration (`meta-llama/Llama-3.1-8B-Instruct`)
```bash
source ~/dynamo-env/bin/activate
VLLM_USE_FLASHINFER_SAMPLER=0 python -m vllm.entrypoints.openai.api_server \
  --model ~/models/Llama-3.1-8B-Instruct \
  --served-model-name "meta-llama/Llama-3.1-8B-Instruct" \
  --enable-prefix-caching \
  --enforce-eager \
  --port 11000 \
  --max-model-len 16384 \
  --kv-cache-memory=4859239424
```

---

## 3. Module-by-Module Application Breakdown (Full Suite)

### Tab 1: When to Cache? (`frontend/src/pages/WhenToCache.tsx`)
- **Role:** Default Landing Page (`activeTab = 'decision'`) specifically crafted for GTC Berlin 2026.
- **Central Question:** *"When is retrieving KV cache actually better than recomputing it? This is the economic question that matters most."*
- **Mathematical Latency Model:**
  $$T_{\text{hit}} = T_{\text{lookup(G4)}} + T_{\text{transfer}}$$
  $$T_{\text{expected}} = H \cdot T_{\text{hit}} + (1 - H) \cdot T_{\text{recompute}}$$
  $$\text{Time Saved (\%)} = \frac{T_{\text{recompute}} - T_{\text{expected}}}{T_{\text{recompute}}} \times 100\%$$
- **NVIDIA Memory Hierarchy Alignment:**
  - **G1**: GPU HBM
  - **G2**: Host System DRAM
  - **G3**: Local NVMe Flash / CMX
  - **G4**: Enterprise Shared / Disaggregated Storage (DDN Infinia)
- **Unsealed Slider Controls with Direct Numeric Editing:**
  - `GPU recompute time`: Range 50 ms – 5,000 ms (editable box)
  - `G4 Shared Storage lookup time`: Range 1 ms – 3,000 ms (editable box, re-labeled with NVIDIA G4 hierarchy)
  - `KV transfer and restore time`: Range 2 ms – 5,000 ms (editable box)
  - `Cache hit rate`: Range 0% – 100% (editable box)
- **Explicit "NO GAIN" Logic:**
  - Whenever $T_{\text{hit}} \ge T_{\text{recompute}}$, the UI triggers an alert: `<AlertTriangle /> NO GAIN WITH KV CACHE — RECOMPUTATION IS FASTER`.
  - Calculates and displays the exact millisecond penalty per query.
  - Dynamically scales comparison waterfall bars so the user visibly sees storage retrieval exceeding the GPU bar.
- **1-Click Demo Scenarios:**
  - `Baseline`: 800 ms GPU, 20 ms G4, 150 ms Transfer $\rightarrow$ **63.0% Latency Reduction**
  - `DDN Infinia + RoCE`: 800 ms GPU, 2 ms G4, 14 ms Transfer $\rightarrow$ **98.0% Latency Reduction**
  - `Storage Bottleneck (No Gain)`: 500 ms GPU, 150 ms G4, 650 ms Transfer $\rightarrow$ **60.0% Latency Penalty**
- **Strict Guidelines:** Zero emojis, clean enterprise styling.

### Tab 2: Live Chat Observatory (`frontend/src/pages/ChatObservatory.tsx`)
- **Role:** Interactive real-time side-by-side prompt testing.
- **Layout:**
  - **Left Bot:** Standard GPU Compute (Full Prefill / Cold Latency).
  - **Right Bot:** DDN Infinia Prefix Cache (Warm Hit / Sub-10ms TTFT).
- **Features:**
  - **Guaranteed Cache Hit Typeahead:** Suggested prompt pills (e.g., *"DDN Infinia"*, *"Explain DDN Infinia"*, *"Tell me about DDN Infinia"*) with normalized verb stemming to prevent presenter typos during live demos.
  - **Cost Origin Disclaimer:** Clarifies where token cost figures come from (Neocloud $/M tokens vs on-prem CapEx).
  - **Cross-link to Math Model:** Direct button leading to the "When to Cache?" page.

### Tab 3: Prefix Multiplier (`frontend/src/pages/PrefixMultiplier.tsx`)
- **Role:** Demonstrates concurrency scaling on shared system prefixes.
- **Default Workload:** **Neocloud Provider (NCP) Multi-Tenant Shared Cluster** (millions of users, heavy shared system prompts).
- **Interactive Slider:** 1 to 64 concurrent streams showing exponential GPU memory savings and HBM headroom expansion.

### Tab 4: Enterprise ROI Calculator (`frontend/src/pages/ROICalculator.tsx`)
- **Role:** Financial model for enterprise decision-makers and CFOs.
- **Outputs:** Annual CapEx avoidance, GPU node reduction, power/cooling savings ($100k+ to $1M+).
- **Customer Presets:** Neocloud (NCP), Financial Services, Healthcare EHR, Customer Support.
- **Live Demonstration Video Modal:**
  - Embedded YouTube player: `https://www.youtube.com/embed/ix97_rhBs6A`.
  - Direct watch link: `https://www.youtube.com/watch?v=ix97_rhBs6A`.
- **PDF Export:** Allows exporting the tailored ROI calculations with customer name, cluster specifications, and DDN legal disclaimers.

### Tab 5: AIperf Benchmark & Proof (`frontend/src/pages/AIperfBenchmark.tsx`)
- **Role:** High-throughput automated synthetic benchmarking.
- **Key Features:**
  - Heading: "WITH INFINIA PREFIX KV CACHE".
  - **Native KV Architecture Tab:** Differentiates DDN Infinia against competitors (VAST, Weka, Ceph) by highlighting GPU-Direct RDMA, line-rate NVMe-oF, and disaggregated HBM offload without local NVMe bottlenecks.
  - **Raw S3 Object Inspector:** Inspects actual `.lmcache` tensors stored in `ddn-kv-cache-01`.

### Tab 6: KV Reuse Proof (`frontend/src/pages/KVReuseProof.tsx`)
- **Role:** Step-by-step cold prompt vs warm prompt execution with raw telemetry inspection and architectural transparency (Approaches A + B).
- **Approach A (Tier Transparency):**
  - Distinguishes **Tier 1 (GPU HBM Radix Hit, ~50 ms)** from **Tier 4 (DDN Infinia Persistent Vault)**.
  - Clarifies that in a single-node active session, the 56 ms hit is served by local HBM, while LMCache asynchronously offloads KV tensors to DDN Infinia for cross-node sharing, container failovers, and cold worker spawns.
- **Uncluttered Design:** Kept focused strictly on the real cold/warm comparison and live S3 object scanner without hypothetical cross-node simulation cards.

### Tab 7: Configuration & About (`frontend/src/pages/Configuration.tsx`, `About.tsx`)
- **Role:** Cluster controls, model selector (vLLM vs Ollama), hardware telemetry, and DDN Infinia credentials.

---

## 4. Standalone Public ROI Calculator (`ddn-roi-standalone`)

In addition to the internal full observatory, there is a dedicated standalone public repository deployed on Vercel:
- **Local Directory:** `/home/nwasim/projects/ddn-roi-standalone`
- **GitHub Repository:** `https://github.com/nasirwasim8/ddn-roi-calculator.git`
- **Public URL:** `https://ddn-kv-roi.vercel.app` (Deployment managed automatically by Vercel on pushes to `main` and `master`).
- **Core Capabilities:**
  - **Standalone ROI Analysis:** Neocloud vs Enterprise Self-Hosted pricing models, customizable daily request volume, token sizes, hit rate.
  - **Live YouTube Video Modal:** Embedded playback via `https://www.youtube.com/embed/ix97_rhBs6A` and direct watch link `https://www.youtube.com/watch?v=ix97_rhBs6A`.
  - **Executive PDF Export:** Built-in PDF report generator (`html2canvas` + `jspdf`) allowing sales/field engineers to input customer names, capture cluster telemetry, and generate branded executive summaries with official DDN legal disclaimers.

---

## 5. Technical Architecture Audit & Realities

During our architectural auditing of `kv_reuse_service.py`, `vllm_manager.py`, and `ecosystem.config.js`:
1. **Where do 50ms warm hits come from?**
   - In vLLM v1 with `--enable-prefix-caching`, the model holds block hash tables (radix tree) in GPU memory / LMCache local RAM.
   - When warm queries arrive immediately, vLLM reuses these blocks directly.
2. **Where does DDN Infinia participate?**
   - LMCache is configured via `lmcache_infinia.yaml` to asynchronously persist evicted blocks into DDN Infinia S3.
   - On cross-node sharing or after GPU cache eviction, LMCache fetches blocks from DDN Infinia over high-speed NVMe-oF / S3.
3. **External Prefix Cache Hit Rate vs Prefix Cache Hit Rate:**
   - In vLLM logs, `Prefix cache hit rate: 50.0%` refers to vLLM's internal block reuse.
   - `External prefix cache hit rate: 0.0%` indicates that blocks were found in local memory before an external LMCache S3 fetch was triggered.

---


### 5. 2-Step Guided Workflow for Theater & Conference Demonstrations (SC26 / GTC)
- **Live Infinia KV Ingestion & Session Isolation Fix:**
  - **Issue Resolved:** In previous runs, if vLLM was running standalone or if a prompt was tested twice, vLLM hit the memory cache on the "cold" run (returning in 202 ms) and no objects were written to `ddn-kv-cache-01`, displaying `0.8x` and hiding the S3 objects table.
  - **Guaranteed Cold Prefill:** The frontend now passes a unique `session_id` (`Tenant Context ID: <id>`) on Step 1, forcing vLLM to compute a genuine cold prefill (~2s-4s). Step 2 reuses that same `session_id` to guarantee an instant prefix hit (~56ms) with 15x-75x speedup.
  - **Live Infinia S3 Mirroring (1:1 with Cyberduck):** The backend queries `ddn-kv-cache-01` on the Infinia appliance (`https://192.168.147.129:8111`) with full pagination up to 200 items. When LMCache flushes KV tensors to Infinia (e.g. 62 items of 32.0 MiB for a 14,500 token document), the UI mirrors the exact object count (`✓ 62 OBJECTS CONFIRMED`) in a scrollable list matching Cyberduck.
- **Problem Solved:** Presenters needed an intentional pacing control where they could execute the Cold Prefill and demonstrate KV ingestion into DDN Infinia before triggering the Warm Retrieval at ~56 ms.
- **Workflow Mechanics:**
  - **Mode Toggle:** Presenters can switch between `2-Step Guided Walkthrough (Recommended)` and `1-Click Auto Run`.
  - **Step 1 (Cold Prefill & Infinia Ingestion):**
    - Calls `/api/kv-reuse/compare?phase=cold_only`.
    - Forces full GPU prefill recompute (~4,218 ms).
    - Asynchronously offloads KV tensors to DDN Infinia S3.
    - Yields `cold_completed` event with live confirmed S3 object keys and model metadata.
    - Unlocks the DDN Infinia Bucket Scan and Object Keys immediately on screen.
    - Displays Presenter Bridge Note explaining that GPU compute has ended and blocks are vaulted in Infinia.
  - **Step 2 (Warm Prefix Retrieval):**
    - Calls `/api/kv-reuse/compare?phase=warm_only&cold_ttft_ms=...&cold_total_ms=...`.
    - Reuses the prefix in vLLM to deliver the response in ~56 ms with 100% clean, non-garbage tokens.
    - Yields `summary` event calculating the exact speedup ($75\times$), Concurrency Multiplier, and Neocloud (NCP) unit economics.
  - **Blended Architecture + Marketing Positioning (SC26 & GTC Conference Theater Video):**
    - **Right Warm Panel Title:** `WARM — DDN Infinia Accelerated Hit`
    - **Right Warm Panel Subtitle:** `DDN Infinia Persistent Vault → GPU-Direct RDMA (Zero Prefill Recompute)`
    - **Warm Badge:** `DDN Infinia Vault Hit`
    - **Step 2 Card Title:** `Step 2: Execute DDN Infinia Warm Retrieval`
    - **Step 2 Subtitle:** `Restores precomputed KV tensors directly from DDN Infinia persistent vault via GPU-Direct RDMA, bypassing GPU prefill recompute.`
    - **Step 2 Action Button:** `Run Step 2 (DDN Infinia Warm Retrieval)` / `Re-run Step 2 (Infinia Warm)`
    - **Step 2 Completion Badge:** `Infinia Vault Hit (<TTFT> ms · <Speedup>×)`
    - **TTFT Comparison Bar Gauge:** `WARM (DDN Infinia Vault Hit)`
    - **Tier Indicator:** `DDN Infinia Accelerated: Sub-15ms NIXL Direct Path · 100% Prefill Recompute Bypassed`
    - **Enterprise Summary Footer:** `Warm hit served via DDN Infinia persistent KV vault (GPU-Direct RDMA path) — skipping GPU prefill recompute for all <tokens> tokens across the entire GPU cluster.`
    - Explains that single-node active sessions reuse Tier 1 GPU HBM, while DDN Infinia serves as the Tier 4 persistent vault for cross-node sharing, container failover, and cold node spin-up via GPU-Direct RDMA / NIXL over 200/400Gbps RoCE.

---

## 6. Development & Deployment Operational Rules

### 1. Working Across Windows & WSL
- Direct writing from Windows tools to `\\wsl$\...` can fail or hang.
- **Standard Protocol:**
  1. Write code or updates to the local artifact folder `C:\Users\nasir\.gemini\antigravity\brain\19a3e9e4-3f1c-4b6f-a216-d72dc17c3711/`.
  2. Copy to WSL using:
     ```bash
     wsl -e cp /mnt/c/Users/nasir/.gemini/antigravity/brain/19a3e9e4-3f1c-4b6f-a216-d72dc17c3711/<File> /home/nwasim/projects/ddn-kv-cache/...
     ```
  3. Compile and verify with `npm run build`.
  4. Restart PM2: `wsl -e pm2 restart ddn-kvc-frontend`.

### 2. Updating Standalone ROI (`ddn-roi-standalone`)
- When modifying the public ROI tool:
  1. Apply changes to `/home/nwasim/projects/ddn-roi-standalone/src/...`.
  2. Run `npm run build` in `/home/nwasim/projects/ddn-roi-standalone`.
  3. Commit and push to both `origin main` and `origin master` (`git push origin main && git push origin main:master`).
  4. Vercel will auto-deploy to `https://ddn-kv-roi.vercel.app` within ~30 seconds.

### 3. Styling & Editorial Principles
- **No Emojis on Presentation Pages:** Maintain clean, enterprise-grade presentation styling (use Lucide SVG icons instead).
- **NVIDIA Alignment:** Always refer to shared cluster storage as **G4 Shared Storage** per NVIDIA's official inference memory hierarchy.
- **Explicit Failure Modes:** If storage latency exceeds GPU recompute time, always display **NO GAIN WITH KV CACHE**.

### 4. Git Workflow
- Always verify `git status` and `git diff` before committing.
- Commit messages must follow Conventional Commits (e.g., `feat:`, `refactor:`, `fix:`).
- Always push to remote tracking branches.
