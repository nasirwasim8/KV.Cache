"""
DDN KV Cache Observatory — KV Reuse Service
Demonstrates KV cache prefix reuse: cold vs warm inference TTFT comparison.
"""
import asyncio
import json
import time
import logging
from typing import AsyncGenerator, Optional
import httpx

logger = logging.getLogger(__name__)

# ── Preset long-context documents ────────────────────────────────────────────
PRESET_DOCUMENTS = {
    "legal_contract": {
        "label": "Legal Contract",
        "icon": "⚖️",
        "system_prompt": (
            "You are an expert legal analyst. Carefully review the following contract and "
            "answer questions about it with precision. Cite specific sections when relevant.\n\n"
            "=== CONTRACT DOCUMENT ===\n"
            "MASTER SERVICE AGREEMENT\n\n"
            "This Master Service Agreement (\"Agreement\") is entered into as of January 1, 2025, "
            "between Acme Corporation (\"Client\") and TechVendor Inc. (\"Provider\").\n\n"
            "SECTION 1 — SERVICES\n"
            "Provider agrees to deliver infrastructure management, cloud optimization, and data "
            "storage services as described in Schedule A. All services must meet the SLA targets "
            "defined in Schedule B including 99.99% uptime, sub-100ms API response times, and "
            "recovery time objectives (RTO) of 4 hours.\n\n"
            "SECTION 2 — PAYMENT TERMS\n"
            "Client shall pay monthly invoices within 30 days. Late payments accrue interest at "
            "1.5% per month. Provider may suspend services after 60 days of non-payment following "
            "written notice. Annual contract value: $2,400,000.\n\n"
            "SECTION 3 — KEY OBLIGATIONS\n"
            "3.1 Provider obligations: Maintain ISO 27001 certification; provide monthly performance "
            "reports; assign a dedicated Customer Success Manager; respond to critical incidents "
            "within 15 minutes; perform quarterly security audits.\n"
            "3.2 Client obligations: Provide necessary access credentials; designate a technical "
            "point of contact; pay invoices on time; comply with acceptable use policies.\n\n"
            "SECTION 4 — DATA PROTECTION\n"
            "Provider shall comply with GDPR, CCPA, and applicable data protection laws. All client "
            "data encrypted at rest (AES-256) and in transit (TLS 1.3). Data deletion within 30 "
            "days of contract termination. No data sharing with third parties without written consent.\n\n"
            "SECTION 5 — TERMINATION\n"
            "Either party may terminate with 90 days written notice. Immediate termination for "
            "material breach not cured within 30 days. Upon termination, Provider exports all "
            "client data within 10 business days in machine-readable format.\n\n"
            "SECTION 6 — LIMITATION OF LIABILITY\n"
            "Total liability capped at 12 months of fees paid. Exclusions: gross negligence, "
            "willful misconduct, or data breaches caused by Provider's failure to maintain "
            "security standards. Consequential damages excluded except for data breach events.\n\n"
            "SECTION 7 — INTELLECTUAL PROPERTY\n"
            "All pre-existing IP remains with originating party. Work product created specifically "
            "for Client under this agreement is Client's property. Provider retains right to use "
            "anonymized, aggregated data for product improvement.\n\n"
            "SECTION 8 — DISPUTE RESOLUTION\n"
            "Disputes first subject to 30-day good faith negotiation. If unresolved, binding "
            "arbitration under AAA rules in Delaware. Governing law: Delaware. Prevailing party "
            "entitled to reasonable attorney fees.\n"
            "=== END CONTRACT ==="
        ),
        "sample_questions": [
            "What are Provider's key obligations in Section 3?",
            "What is the payment term and what happens if payments are late?",
            "How is liability limited under this agreement?",
            "What is the termination notice period?",
        ]
    },
    "medical_report": {
        "label": "Medical Report",
        "icon": "🏥",
        "system_prompt": (
            "You are an expert medical records analyst. Review the following patient case report "
            "and answer clinical questions accurately. Always note any critical findings.\n\n"
            "=== PATIENT CASE REPORT ===\n"
            "Patient: John Doe | DOB: 1965-03-15 | MRN: 4829301\n"
            "Attending Physician: Dr. Sarah Chen, MD, Cardiology\n"
            "Admission Date: 2025-06-10 | Discharge: 2025-06-17\n\n"
            "CHIEF COMPLAINT: Chest pain with exertion, shortness of breath x 3 weeks.\n\n"
            "HISTORY OF PRESENT ILLNESS:\n"
            "60-year-old male with history of Type 2 diabetes (HbA1c 7.8%), hypertension, "
            "hyperlipidemia, and 30 pack-year smoking history (quit 2010). Presents with "
            "progressive exertional chest pain and dyspnea. Denies rest pain, orthopnea, PND. "
            "Reports reduced exercise tolerance from 3 blocks to less than 1 block over 3 weeks.\n\n"
            "DIAGNOSTIC WORKUP:\n"
            "ECG: Normal sinus rhythm, T-wave inversions V4-V6. Troponin I: 0.04 ng/mL (elevated). "
            "Echo: EF 45%, anterior wall hypokinesis, grade II diastolic dysfunction. "
            "Stress test: 6 METs, ST depression 2mm in leads V4-V6 at 85% max HR. "
            "Coronary angiography: 85% LAD stenosis (proximal), 60% RCA stenosis (mid).\n\n"
            "DIAGNOSIS: NSTEMI, CAD 2-vessel disease.\n\n"
            "TREATMENT:\n"
            "Emergency PCI: Drug-eluting stent placed in LAD. Medical management for RCA. "
            "Medications on discharge: Aspirin 81mg daily, Ticagrelor 90mg BID x 12 months, "
            "Atorvastatin 80mg daily, Lisinopril 10mg daily, Metoprolol succinate 50mg daily, "
            "Metformin 1000mg BID (diabetes management). "
            "Cardiac rehab referral. Follow-up 2 weeks.\n\n"
            "ALLERGIES: Penicillin (rash), Sulfa drugs (anaphylaxis).\n"
            "=== END REPORT ==="
        ),
        "sample_questions": [
            "What was the primary diagnosis and which vessel was most critically affected?",
            "What medications was the patient discharged on and why?",
            "What were the key diagnostic findings that led to PCI?",
            "Does this patient have any medication allergies to note?",
        ]
    },
    "technical_manual": {
        "label": "Technical Manual",
        "icon": "🔧",
        "system_prompt": (
            "You are a senior systems engineer and technical documentation expert. "
            "Review the following infrastructure manual and answer configuration questions.\n\n"
            "=== DDN INFINIA STORAGE SYSTEM — TECHNICAL REFERENCE ===\n\n"
            "ARCHITECTURE OVERVIEW\n"
            "DDN Infinia is a distributed object storage system optimized for AI workloads. "
            "It provides S3-compatible API access with native NIXL (NVIDIA Inference Transfer Library) "
            "integration for GPU-direct KV cache offloading.\n\n"
            "CLUSTER CONFIGURATION\n"
            "Minimum cluster: 3 storage nodes for HA. Each node: 2x 25GbE or 1x 100GbE. "
            "Recommended: RoCE v2 for RDMA KV cache transfers. "
            "Storage pools: SYSTEM (SSD tier), DATA (HDD tier), CACHE (NVMe tier).\n\n"
            "KVCACHE DATASET SETUP\n"
            "1. Enable feature: redcli cluster tunable kvcache enable -f\n"
            "2. Create dataset: redcli dataset create <name> -f kvcache\n"
            "3. Default profile DEFAULT_KVCACHE_1: block_size=4KiB, bucket_size=512KiB, "
            "dir_nstripes=128, dp_profile=2.\n"
            "4. NIXL plugin path: /opt/ddn/red/lib/libred_client.so\n\n"
            "NIXL INTEGRATION\n"
            "Supported backends: INFINIA (primary), GDS, POSIX, UCX, LIBFABRIC.\n"
            "LMCache config (nixl-llama-gpu.yaml):\n"
            "  chunk_size: 256\n"
            "  local_cpu: 0\n"
            "  remote_url: nixl://\n"
            "  enable_kv_cache_events: true\n"
            "vLLM launch: LD_PRELOAD=libred_client.so:libred_async.so \\\n"
            "  LMCACHE_CONFIG_FILE=nixl-llama-gpu.yaml \\\n"
            "  python3 -m dynamo.vllm --kv-transfer-config '{\"kv_connector\":\"LMCacheConnector\"}'\n\n"
            "PERFORMANCE TUNING\n"
            "Network buffers: net.ipv4.tcp_rmem=4096 131072 8388608\n"
            "net.core.rmem_max=8388608\n"
            "KV cache memory: --kv-cache-memory-bytes 12g\n"
            "Max batched tokens: --max-num-batched-tokens 8192\n"
            "=== END MANUAL ==="
        ),
        "sample_questions": [
            "How do I enable KVCache on an Infinia cluster?",
            "What is the DEFAULT_KVCACHE_1 profile block size?",
            "What LD_PRELOAD libraries are needed to run Dynamo with Infinia?",
            "What network buffer settings are recommended?",
        ]
    }
}


async def run_inference(
    endpoint_url: str,
    model: str,
    system_prompt: str,
    question: str,
    timeout: float = 120.0,
) -> tuple[float, float, str]:
    """
    Call the inference endpoint. Returns (ttft_ms, total_ms, response_text).
    Measures TTFT by timing to first streaming chunk.
    """
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "max_tokens": 300,
        "stream": True,
        "temperature": 0.1,
    }

    start = time.perf_counter()
    ttft_ms = -1.0
    response_text = ""

    try:
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{endpoint_url.rstrip('/')}/v1/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            if ttft_ms < 0:
                                ttft_ms = (time.perf_counter() - start) * 1000
                            response_text += delta
                    except Exception:
                        pass
    except Exception as e:
        total_ms = (time.perf_counter() - start) * 1000
        return ttft_ms if ttft_ms >= 0 else total_ms, total_ms, f"[Error: {e}]"

    total_ms = (time.perf_counter() - start) * 1000
    return ttft_ms, total_ms, response_text


async def stream_reuse_comparison(
    endpoint_url: str,
    model: str,
    preset_key: str,
    custom_question: str = "",
    run_without_cache: bool = True,
) -> AsyncGenerator[str, None]:
    """
    SSE generator for the KV reuse proof demo.
    Runs cold (no cache) and warm (with cache) inference, yields events.

    Event types:
      {"type": "status",   "phase": "cold"|"warm",  "message": "..."}
      {"type": "token",    "phase": "cold"|"warm",  "text": "..."}
      {"type": "ttft",     "phase": "cold"|"warm",  "ttft_ms": X, "total_ms": Y}
      {"type": "summary",  "cold_ttft_ms": X, "warm_ttft_ms": Y, "speedup": Z}
      {"type": "error",    "message": "..."}
    """

    def sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    preset = PRESET_DOCUMENTS.get(preset_key)
    if not preset:
        yield sse({"type": "error", "message": f"Unknown preset: {preset_key}"})
        return

    question = custom_question.strip() if custom_question.strip() else preset["sample_questions"][0]
    system_prompt = preset["system_prompt"]

    # ── COLD RUN ──────────────────────────────────────────────────────────────
    yield sse({"type": "status", "phase": "cold", "message": "Starting cold inference (no cached KV)..."})
    yield sse({"type": "status", "phase": "warm", "message": "Waiting for cold run to complete first..."})

    try:
        cold_ttft, cold_total, cold_text = await run_inference(
            endpoint_url, model, system_prompt, question
        )
        yield sse({"type": "ttft", "phase": "cold", "ttft_ms": round(cold_ttft), "total_ms": round(cold_total)})
        yield sse({"type": "response", "phase": "cold", "text": cold_text})
    except Exception as e:
        yield sse({"type": "error", "message": f"Cold run failed: {e}"})
        return

    # Small delay between runs
    await asyncio.sleep(0.5)

    # ── WARM RUN (same prefix — should hit KV cache) ──────────────────────────
    yield sse({"type": "status", "phase": "warm", "message": "Starting warm inference (KV cache should hit)..."})

    try:
        warm_ttft, warm_total, warm_text = await run_inference(
            endpoint_url, model, system_prompt, question
        )
        yield sse({"type": "ttft", "phase": "warm", "ttft_ms": round(warm_ttft), "total_ms": round(warm_total)})
        yield sse({"type": "response", "phase": "warm", "text": warm_text})
    except Exception as e:
        yield sse({"type": "error", "message": f"Warm run failed: {e}"})
        return

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    if cold_ttft > 0 and warm_ttft > 0:
        speedup = round(cold_ttft / warm_ttft, 1) if warm_ttft > 0 else 0
        tokens_saved = len(system_prompt.split())
        yield sse({
            "type": "summary",
            "cold_ttft_ms": round(cold_ttft),
            "warm_ttft_ms": round(warm_ttft),
            "cold_total_ms": round(cold_total),
            "warm_total_ms": round(warm_total),
            "speedup": speedup,
            "tokens_in_context": len(system_prompt.split()),
            "preset": preset_key,
        })
