# SC 2026 Theater Presentation Guide
## "Breaking the Inference Memory Wall: Disaggregated KV Cache as Supercomputing Context Memory"

> **Conference:** Supercomputing 2026 (SC 2026) — November 2026  
> **Format:** 15-Minute Theater Presentation (DDN Booth / Partner Theater / Exhibitor Forum)  
> **Speaker:** DDN Technical Representative / Solutions Architect  
> **Target Audience:** HPC System Architects, National Lab Directors, AI Cluster Engineers, Neocloud Builders  
> **Live Demo Applications:**  
> - Full Cluster Observatory: `http://localhost:5176`  
> - Public Standalone Tool: `https://ddn-kv-roi.vercel.app`  

---

## 1. Executive Summary & SC Thematic Alignment

### The Supercomputing Narrative Hook
For over three decades, the storage conversation at Supercomputing focused on **Checkpoint/Restart** — engineering storage fabrics to absorb massive burst writes so petascale simulations could recover after hardware faults.

In the era of AI Supercomputers and Frontier Foundation Models (32k to 1M token contexts), the primary I/O bottleneck has inverted:
- **From Burst Writes to Sub-Millisecond Reads:** The new storage bottleneck is **Inference Context Memory (KV Cache)**.
- **The Physics Problem:** Modern GPUs (NVIDIA H100, H200, Blackwell B200) prefill tokens at thousands of tokens per second. If storage lookup and fabric transit take longer than GPU Tensor Core recomputation, **caching produces NO GAIN and penalizes inference latency**.
- **The DDN Infinia Breakthrough:** By coupling **GPU-Direct RDMA over 200/400Gbps RoCE/InfiniBand** with line-rate NVMe-oF, DDN Infinia elevates shared storage into **NVIDIA's G4 Memory Tier**, delivering sub-15ms KV tensor restoration, 75× TTFT acceleration, and 4.8× concurrency headroom without adding GPU nodes.

---

## 2. 15-Minute Minute-by-Minute Run of Show

| Timestamp | Phase | Topic & Core Message | On-Screen Action / Visual |
| :--- | :--- | :--- | :--- |
| **00:00 – 02:30** | **Hook & The HPC Shift** | The Inference Memory Wall & Why Checkpoint Storage Fails at KV Cache | Title Slide / SuperPOD Architecture Diagram |
| **02:30 – 06:30** | **Foundational Math** | "When to Cache?" Decision Model & NVIDIA G1–G4 Memory Hierarchy | Live App: Tab 1 (`WhenToCache.tsx`) |
| **06:30 – 09:30** | **Live Telemetry Proof** | Real-Time Side-by-Side: 4,200 ms vs 56 ms TTFT (75× Latency Drop) | Live App: Tab 2 (`ChatObservatory.tsx`) |
| **09:30 – 12:00** | **Cluster Scale & Density**| Multi-Tenant Headroom: 4.8× Concurrency Multiplier on Shared Prefixes | Live App: Tab 3 (`PrefixMultiplier.tsx`) |
| **12:00 – 14:00** | **Economics & Power** | Megawatts & Millions: Avoiding GPU Cluster CapEx & Power Draw | Live App: Tab 4 (`ROICalculator.tsx`) |
| **14:00 – 15:00** | **Summary & Call-to-Action**| Key Takeaways, Private Cluster Testing & Public Tool QR Code | Summary Slide / QR Code (`ddn-kv-roi.vercel.app`) |

---

## 3. Screen-by-Screen Speaker Script & Stage Directions

### [00:00 – 02:30] Phase 1: The Opening Hook & The HPC Paradigm Shift
**Visual:** Slide: *"The Shift from Checkpoint/Restart to Active Context Memory"*

#### Speaker Script:
> *"Good morning, everyone, and welcome to SC 2026. If you look at the history of storage at Supercomputing over the last 30 years, our entire industry was defined by one problem: **Checkpoint/Restart**. We built parallel file systems to absorb massive, periodic, sequential burst writes so that if an MPI node crashed on a 10,000-node simulation, the job didn't have to restart from scratch.*
>
> *Today, the biggest I/O crisis in AI Supercomputing is the exact opposite. It isn't checkpointing writes — **it's active context memory retrieval for LLM inference**.*
>
> *As scientific foundation models, genomics pipelines, and agentic workflows expand to 32k, 128k, and million-token contexts, GPU High Bandwidth Memory (HBM) is suffocating. Storing KV tensors inside GPU memory consumes tens of gigabytes per session. Your most expensive compute resource — GPU Tensor Cores — is sitting idle waiting for memory to free up.*
>
> *The natural engineering impulse is: 'Let's offload the KV cache to cluster storage.' But here is the physical trap: **If your storage lookup and network transfer take longer than letting the GPU compute the tokens from scratch, caching is slower than recomputing. You get NO GAIN.'**
>
> *Let's look at the actual physics."*

---

### [02:30 – 06:30] Phase 2: Foundational Math & The Decision Model
**Visual:** Switch browser to **When to Cache?** ([`WhenToCache.tsx`](file:///home/nwasim/projects/ddn-kv-cache/frontend/src/pages/WhenToCache.tsx))

#### Stage Directions:
1. Show the top title: *"When is retrieving KV cache actually better than recomputing it?"*
2. Point out NVIDIA's official memory hierarchy:
   - **G1:** GPU HBM (nanoseconds)
   - **G2:** Host CPU DRAM
   - **G3:** Local Node NVMe Flash
   - **G4:** Enterprise Shared / Disaggregated Storage (DDN Infinia)
3. **Click the preset button: `Storage Bottleneck (No Gain)`**:
   - Recompute = `500 ms`
   - G4 Lookup = `150 ms`
   - KV Transfer = `650 ms`
   - Total Retrieval = `800 ms`
4. **Point to the big red alert:** `<AlertTriangle /> NO GAIN WITH KV CACHE — RECOMPUTATION IS FASTER`.
5. **Click the preset button: `DDN Infinia + RoCE`**:
   - Recompute = `800 ms`
   - G4 Lookup = `2 ms`
   - KV Transfer = `14 ms`
   - Total Retrieval = `16 ms`
6. **Point to the green output:** `98.0% Latency Reduction` and dynamic waterfall bars.

#### Speaker Script:
> *"Here is the mathematical formula governing every inference cluster in this convention center today:*
>
> *A cache hit only wins if G4 Storage Lookup plus Network Transfer is strictly less than GPU Recompute time:*
> $$T_{\text{lookup(G4)}} + T_{\text{transfer}} < T_{\text{recompute(GPU)}}$$
>
> *Look at what happens on standard cluster storage — a cloud S3 bucket over TCP, or a legacy NAS volume [Click 'Storage Bottleneck']:*
> *If a prompt takes 500 ms for an H100 to prefill, but querying your storage metadata takes 150 ms and pulling the KV tensor over standard TCP takes 650 ms, your total retrieval is 800 ms. You just introduced a **+60% latency penalty**. Caching on standard storage is counter-productive.*
>
> *Now, watch what happens when we introduce **DDN Infinia** into the NVIDIA G4 Tier [Click 'DDN Infinia']:*
> *Because Infinia operates on GPU-Direct RDMA over 200/400Gbps RoCE, storage lookup drops to 2 ms and KV tensor transfer plummets to 14 ms. Total retrieval is 16 ms.*
> *Against an 800 ms GPU prefill, you have bypassed 784 ms of heavy compute — delivering a **98% latency reduction**.*
>
> *Let's see this running live on a real vLLM cluster."*

---

### [06:30 – 09:30] Phase 3: Live Telemetry Proof in Chat Observatory
**Visual:** Click on **Live Chat Observatory** ([`ChatObservatory.tsx`](file:///home/nwasim/projects/ddn-kv-cache/frontend/src/pages/ChatObservatory.tsx))

#### Stage Directions:
1. Explain the split-screen layout:
   - **Left:** Standard GPU Compute (Full Cold Prefill).
   - **Right:** DDN Infinia Prefix Cache (GPU-Direct Warm Hit).
2. Click one of the **Guaranteed Cache Hit Suggestion Pills** (e.g., *"DDN Infinia"*).
3. Watch the tokens stream side-by-side in real time.
4. Point out the telemetry badges:
   - Cold TTFT: **~4,200 ms** (thousands of tokens recomputed from scratch).
   - Infinia TTFT: **~56 ms** (instant response).
   - Acceleration: **75× faster Time-to-First-Token**.

#### Speaker Script:
> *"On the left, we have a standard GPU inference server. On the right, we have the exact same model backed by DDN Infinia persistent memory.*
>
> *Let's fire a complex enterprise prompt [Click 'DDN Infinia' pill].*
>
> *Watch the TTFT — Time-to-First-Token.*
> *The standard server on the left takes **4,218 milliseconds** just to compute the initial prompt before generating a single word. That's over 4 seconds of compute tensor cores pinned at 100% duty cycle.*
>
> *The Infinia-backed server on the right returned its first token in **56 milliseconds**. That is a **75× reduction in TTFT**.*
>
> *Why does this matter in an AI supercomputer? Because those 4,160 milliseconds of saved GPU compute are immediately freed to process other tokens."*

---

### [09:30 – 12:00] Phase 4: Cluster Concurrency & Density (Prefix Multiplier)
**Visual:** Click on **Prefix Multiplier** ([`PrefixMultiplier.tsx`](file:///home/nwasim/projects/ddn-kv-cache/frontend/src/pages/PrefixMultiplier.tsx))

#### Stage Directions:
1. Explain the **Neocloud / Multi-Tenant HPC Cluster Workload**:
   - Hundreds of researchers or enterprise users accessing shared system prompts, scientific manuals, code repositories, or agentic frameworks.
2. Drag the **Concurrency Stream Slider** from 1 up to 16, 32, and 64 streams.
3. Highlight:
   - GPU HBM consumption stays flat.
   - Concurrency multiplier jumps to **4.8×**.

#### Speaker Script:
> *"Let's talk about cluster density. When you build a multi-tenant research cluster or a Neocloud, you have thousands of users hitting the same foundational models with shared prefixes — system instructions, document embeddings, codebases.*
>
> *In a traditional cluster, every single concurrent session duplicates the KV cache inside expensive GPU HBM. By stream 16, your GPUs are out of memory (OOM), forcing you to buy more DGX servers just to handle concurrent user sessions.*
>
> *With DDN Infinia, common prefix KV tensors are pooled in shared G4 memory [Drag slider to 32].*
> *Instead of duplicating KV tensors across every GPU, each GPU simply streams the pre-computed KV tensors across the RoCE fabric on demand.*
>
> *The result? **A 4.8× Concurrency Multiplier**. You can serve almost 5× more concurrent users and jobs on the exact same GPU node footprint without spending another dollar on GPU hardware."*

---

### [12:00 – 14:00] Phase 5: Economics, CapEx Avoidance & Megawatts
**Visual:** Click on **Enterprise ROI Calculator** ([`ROICalculator.tsx`](file:///home/nwasim/projects/ddn-kv-cache/frontend/src/pages/ROICalculator.tsx))

#### Stage Directions:
1. Select the **Neocloud (NCP) Multi-Tenant** preset.
2. Point out the financial metrics:
   - **$100k+ to $1.2M+ Annual CapEx Avoided**
   - **GPU Node Reductions**
   - **Megawatts of Power & Cooling Saved**
3. Click **"Watch Live Demonstration"** to reveal the embedded YouTube video modal proving private cluster telemetry.
4. Point out the **"Export Executive PDF"** button.

#### Speaker Script:
> *"Let's translate these milliseconds into what every supercomputing center director and CFO cares about: **CapEx and Megawatts**.*
>
> *Every time your GPUs recompute a static prefix, they burn peak wattage. In an 8-way H100 or B200 node, that's 5 to 8 kilowatts being burned on redundant math.*
>
> *By eliminating 80%+ of redundant prefill compute, you achieve two massive economic wins:*
> 1. *You slash GPU power draw and cooling demands.*
> 2. *Because each node now handles 4.8× more throughput, you defer millions of dollars in future GPU cluster expansions.*
>
> *For an average mid-scale inference cluster handling 50,000 queries per day, this represents over **$750,000 in direct annual CapEx and electricity avoidance**.*
>
> *If you'd like to see the private cluster benchmark playback, we have the full telemetry recording embedded directly inside this calculator [Pop open modal], and you can export a tailored PDF report for your cluster right here."*

---

### [14:00 – 15:00] Phase 6: Takeaways & Call to Action
**Visual:** Summary Slide with QR Code pointing to `https://ddn-kv-roi.vercel.app`

#### Speaker Script:
> *"To summarize the new reality of AI Supercomputing storage:*
> 1. *GPU HBM is too precious to waste on static KV tensors.*
> 2. *Standard storage introduces latency penalties — you need sub-15ms RDMA transfers.*
> 3. *DDN Infinia makes shared storage act as active NVIDIA G4 memory, unlocking 75× faster TTFT and 4.8× concurrency headroom.*
>
> *You don't have to take our word for it. Pull out your phones, scan this QR code or go to **ddn-kv-roi.vercel.app**, and run the math on your own lab's workload right now.*
>
> *Please come by the DDN booth for live 1-on-1 private cluster demonstrations. Thank you!"*

---

## 4. Technical Objection Handling & Stage Q&A Cheat Sheet

| Likely SC Audience Question | Technical Answer to Deliver on Stage |
| :--- | :--- |
| **"Why not just put local NVMe SSDs inside each DGX node (G3 Tier)?"** | *"Local NVMe works for a single GPU, but it fails in a supercomputer. First, local SSDs have limited endurance under heavy write churn. Second, local SSDs cannot be shared across nodes — if User A hits Node 1 and User B hits Node 2, you get zero cache reuse. DDN Infinia provides cluster-wide disaggregated G4 memory accessible by every GPU over RoCE."* |
| **"Where do the 56 ms warm hit numbers come from?"** | *"In vLLM v1 with prefix caching enabled, active block hash tables reside in GPU/LMCache RAM. As tokens age or memory fills, LMCache asynchronously offloads KV tensor chunks to DDN Infinia over high-speed NVMe-oF/S3, enabling cross-node session resumption."* |
| **"Does this require modifying our model weights or LLM code?"** | *"No. It integrates natively with standard OpenAI-compatible serving frameworks like vLLM, SGLang, and NVIDIA Dynamo/NIXL. No changes to model checkpoints or training pipelines are required."* |
| **"What network fabric is required?"** | *"DDN Infinia operates over standard 200Gbps and 400Gbps RoCE (RDMA over Converged Ethernet) as well as InfiniBand fabrics, utilizing GPU-Direct RDMA to transfer tensors straight into GPU HBM without CPU copies."* |

---

## 5. Live Stage Checklist

- [ ] Open Chrome tab 1: `http://localhost:5176` (Landing on *When to Cache?*)
- [ ] Open Chrome tab 2: `https://ddn-kv-roi.vercel.app/#calculator` (Public backup on Vercel)
- [ ] Ensure PM2 processes are healthy (`pm2 status`: `ddn-kvc-frontend`, `ddn-kvc-backend`, `ddn-vllm`)
- [ ] Set browser zoom to **110%** for clear visibility on booth presentation monitors
- [ ] Keep presentation script within the 14-minute mark to allow 1 minute for questions and booth invites.
