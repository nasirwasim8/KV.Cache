"""
DDN KV Cache Observatory - API Routes
All endpoints for chat observatory, prefix multiplier, cache stats, and config.
"""
import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.kv_cache import kv_cache
from app.services.ollama_client import ollama_client

logger = logging.getLogger(__name__)

health_router  = APIRouter(tags=["Health"])
config_router  = APIRouter(prefix="/config", tags=["Config"])
chat_router    = APIRouter(prefix="/chat", tags=["Chat"])
prefix_router  = APIRouter(prefix="/prefix", tags=["Prefix"])
cache_router   = APIRouter(prefix="/cache", tags=["Cache"])


# ── In-memory session store ─────────────────────────────────────────────────
# { session_id: {"history": [...], "created_at": float} }
_sessions: dict = {}


def get_or_create_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {"history": [], "created_at": time.time()}
    return _sessions[session_id]


# ── Scenario definitions for Prefix Multiplier ──────────────────────────────
SCENARIOS = {
    "legal": {
        "name": "Legal Document AI",
        "icon": "⚖️",
        "description": "Law firm querying a 200-page Master Services Agreement",
        "daily_requests": 50_000,
        "system_prompt": """You are an expert AI legal assistant for Morrison & Foerster LLP.
You have been provided the complete Master Services Agreement between TechCorp Inc. (\"Client\")
and DataSolutions LLC (\"Vendor\"), dated January 15, 2026.

KEY CONTRACT PROVISIONS:
1. TERM & TERMINATION: Initial term of 36 months commencing January 15, 2026. Either party may
   terminate for cause with 30 days written notice. Client may terminate for convenience with
   90 days notice and payment of 25% of remaining contract value.

2. INTELLECTUAL PROPERTY: All work product, deliverables, and custom developments created under
   this agreement are owned exclusively by Client. Vendor retains ownership of pre-existing IP
   and general methodologies. A perpetual, royalty-free license is granted to Client for all
   Vendor tools used in deliverable creation.

3. LIABILITY & INDEMNIFICATION: Vendor's total aggregate liability is capped at 12 months of
   fees paid. Mutual indemnification for third-party IP infringement claims. Client indemnifies
   Vendor for use of Client-provided data. Consequential damages are excluded by both parties.

4. DATA SECURITY & COMPLIANCE: Vendor must maintain SOC 2 Type II certification throughout the
   term. All Client data processed under CCPA and GDPR requirements. Breach notification within
   72 hours. Data encrypted at rest (AES-256) and in transit (TLS 1.3+). Annual penetration
   testing required.

5. SERVICE LEVELS: 99.95% uptime SLA for production systems. Maximum 4-hour RTO, 1-hour RPO
   for disaster recovery. Credits of 10% per 0.1% downtime below SLA threshold.

6. PAYMENT TERMS: Net-30 invoicing. 1.5% monthly late fee after 45 days. Annual 3% CPI
   adjustment starting Year 2. Disputed invoices must be raised within 15 days.

7. DISPUTE RESOLUTION: Mandatory mediation before arbitration. AAA arbitration rules apply.
   Venue: New York, NY. Governing law: State of New York.

Answer all questions about this agreement accurately and cite specific provisions.""",
        "example_queries": [
            "What are the termination provisions?",
            "Summarize the IP ownership terms",
            "What is the liability cap?",
            "Explain the data security requirements",
            "What are the payment terms?",
        ]
    },
    "healthcare": {
        "name": "Healthcare AI Assistant",
        "icon": "🏥",
        "description": "Hospital physicians querying a shared clinical knowledge base",
        "daily_requests": 25_000,
        "system_prompt": """You are a clinical AI assistant at Memorial Health System supporting
physicians with evidence-based medical guidance. You have access to the following clinical
knowledge base for this session:

PATIENT POPULATION CONTEXT:
Memorial Health System serves approximately 85,000 patients annually across 3 hospitals and
12 outpatient clinics. Primary service lines include Oncology, Cardiology, Neurology, and
Emergency Medicine. Average patient age: 58. Comorbidity rate: 67%.

CURRENT CLINICAL GUIDELINES LOADED:
- ACC/AHA 2023 Heart Failure Guidelines (Class I recommendations)
- NCCN Oncology Guidelines v2026.1 for solid tumors
- ADA Standards of Medical Care in Diabetes 2026
- Sepsis-3 Bundle Protocol (Surviving Sepsis Campaign 2024)
- Memorial Health Formulary: 847 approved medications, 23 restricted, 12 on shortage

DRUG INTERACTION DATABASE:
High-alert medications flagged: anticoagulants, insulin, opioids, chemotherapy agents.
Real-time shortage alerts: Amoxicillin-clavulanate 875mg (substitute: Augmentin IV),
Metformin 1000mg ER (substitute: IR formulation with dose adjustment).

QUALITY METRICS CONTEXT:
Current HCAHPS score: 84th percentile. Readmission rate: 11.2% (target: <10%).
HAI rate: 0.8 per 1,000 patient days. Sepsis bundle compliance: 91%.

Provide concise, evidence-based clinical guidance. Always recommend physician judgment
and note when specialist consultation is warranted. Do not replace clinical decision-making.""",
        "example_queries": [
            "What's the recommended treatment for newly diagnosed HFrEF?",
            "Summarize the sepsis bundle protocol",
            "What are current drug shortages affecting cardiology?",
            "Guide me through the ADA diabetes treatment algorithm",
        ]
    },
    "telco": {
        "name": "Contact Center AI",
        "icon": "📞",
        "description": "Telecom agent assist with shared compliance script",
        "daily_requests": 200_000,
        "system_prompt": """You are an AI assistant for Verizon Consumer Sales agents.
Every customer interaction must follow these compliance requirements and product knowledge:

MANDATORY COMPLIANCE SCRIPT (Federal Requirements):
- CPNI Disclosure: Before discussing any account details, agents must verify caller identity
  with: Date of birth + last 4 SSN + account PIN. Log all CPNI disclosures in CARE system.
- Do-Not-Call Registry: Check DNC status before any outbound offers. DNC violations carry
  $51,744 per incident FCC fines.
- TCPA Compliance: No autodial to cell without written consent. Document all consent grants.
- Truth-in-Billing: All fees must be disclosed upfront. No hidden charges.
- E911 Disclosure: VoIP customers must acknowledge E911 limitations.

CURRENT PROMOTIONS (Valid through July 31, 2026):
- myPlan Unlimited Plus: $45/line for 4 lines + $10 Disney+/Hulu/ESPN bundle credit
- Home Internet 5G: $35/mo with AutoPay + device included (waitlist: 847K customers)
- Trade-In Promo: Up to $1000 off iPhone 17 Pro with any trade-in + Unlimited Plus
- BYOD Offer: $150 eSIM credit for qualified unlocked devices

ESCALATION TRIGGERS (transfer to Tier 2 immediately):
- Customer threatens legal action or references attorney
- Account over $500 past due
- Third complaint about same issue
- Executive escalation request

RETENTION PLAYBOOK:
If customer mentions cancellation: (1) empathize (2) identify root cause (3) offer retention
credit up to $120/year for tenure >2 years (4) if declining, offer 30-day pause option.

Answer agent questions about policies, promotions, and compliance requirements.""",
        "example_queries": [
            "What's the current iPhone trade-in promotion?",
            "Walk me through the CPNI verification process",
            "When should I escalate to Tier 2?",
            "What are the retention options for a 3-year customer?",
        ]
    }
}


# ── Pydantic Models ──────────────────────────────────────────────────────────

class ConfigSave(BaseModel):
    endpoint_url: str
    access_key: str
    secret_key: str
    bucket_name: str = "ddn-kv-cache-01"
    region: str = "us-east-1"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"


class ChatRequest(BaseModel):
    session_id: str
    message: str
    demo_mode: str = "business"      # "business" | "technical"
    audience_mode: str = "business"
    pricing_tier: str = "self_hosted_h100"  # "self_hosted_h100" | "cloud_openai" | "cloud_anthropic"


class SeedRequest(BaseModel):
    use_case: str  # "legal" | "healthcare" | "telco"


class PrefixRunRequest(BaseModel):
    use_case: str
    query: str
    request_number: int = 1


# ── Health ───────────────────────────────────────────────────────────────────

@health_router.get("/health")
async def health():
    ollama_status = ollama_client.health_check()
    gpu_info = ollama_client.gpu_info()
    infinia_status = kv_cache.test_connection() if settings.infinia_endpoint else {"success": False, "message": "Not configured"}

    return {
        "status": "ok",
        "ollama_available": ollama_status.get("available", False),
        "ollama_model": settings.ollama_model,
        "model_ready": ollama_status.get("model_ready", False),
        "infinia_configured": bool(settings.infinia_endpoint and settings.infinia_access_key),
        "infinia_connected": infinia_status.get("success", False),
        "gpu_available": gpu_info.get("available", False),
        "gpu_name": gpu_info.get("name", "Unknown"),
        "gpu_memory_total_mb": gpu_info.get("memory_total_mb", 0),
        "device": gpu_info.get("name", "cpu") if gpu_info.get("available") else "cpu",
        "version": "1.0.0",
    }


# ── Config ───────────────────────────────────────────────────────────────────

@config_router.get("")
async def get_config():
    return {
        "success": True,
        "infinia_endpoint": settings.infinia_endpoint,
        "infinia_access_key": ("*" * 8 + settings.infinia_access_key[-4:]) if len(settings.infinia_access_key) > 4 else "",
        "infinia_bucket": settings.infinia_bucket,
        "infinia_region": settings.infinia_region,
        "ollama_url": settings.ollama_url,
        "ollama_model": settings.ollama_model,
        "config_loaded": bool(settings.infinia_endpoint),
    }


@config_router.post("/save")
async def save_config(body: ConfigSave):
    settings.infinia_endpoint = body.endpoint_url
    settings.infinia_access_key = body.access_key
    settings.infinia_secret_key = body.secret_key
    settings.infinia_bucket = body.bucket_name
    settings.infinia_region = body.region
    settings.ollama_url = body.ollama_url
    settings.ollama_model = body.ollama_model
    settings.save()
    kv_cache.reinit()
    return {"success": True, "message": "Configuration saved"}


@config_router.post("/test")
async def test_config(body: ConfigSave):
    # Apply temporarily for test
    settings.infinia_endpoint = body.endpoint_url
    settings.infinia_access_key = body.access_key
    settings.infinia_secret_key = body.secret_key
    settings.infinia_bucket = body.bucket_name
    settings.infinia_region = body.region
    kv_cache.reinit()
    result = kv_cache.test_connection()
    settings.save()
    return result


# ── Chat Observatory ─────────────────────────────────────────────────────────

@chat_router.post("/send")
async def chat_send(req: ChatRequest):
    """
    Core Chat Observatory endpoint.

    Cache key = hash(message only) — so any repeated question hits, regardless of
    which turn or session it's in. This demonstrates real enterprise KV cache behavior:
    the same question asked by 10,000 users only computes once.

    LEFT panel:  Always sends full growing context to Ollama (recomputes every turn)
    RIGHT panel: Checks Infinia by message hash — HIT = serve instantly, MISS = compute + store
    """
    session = get_or_create_session(req.session_id)
    history = session["history"]

    # Build full prompt including ALL conversation history (left panel = grows every turn)
    history_text = ""
    for turn in history:
        history_text += f"\nUser: {turn['user']}\nAssistant: {turn['assistant']}\n"
    full_prompt = history_text.strip() + (f"\nUser: {req.message}" if history_text else req.message)

    # ── KEY FIX: Cache key = message ONLY (not history)
    # This means: ask "What is Infinia?" on turn 1 → MISS → stored
    #             ask "What is Infinia?" on turn 2 → HIT → served from Infinia instantly
    # This reflects real enterprise KV cache: same query = same cache hit for ALL users
    cache_key = kv_cache.compute_key([], req.message)

    # ── Check Infinia Cache FIRST (right panel) ──────────────────────────
    t_cache_check = time.perf_counter()
    cache_hit, cached_data, infinia_check_latency, object_meta = kv_cache.check(cache_key)

    # ── Left Panel: Always full recompute (even on cache hit) ────────────
    # Left always resends the FULL prompt including growing history → token count grows each turn
    try:
        t_left = time.perf_counter()
        left_result = ollama_client.generate(full_prompt)
        left_time = (time.perf_counter() - t_left) * 1000
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama error: {e}")

    # Token counts: left grows with history, right only counts new message
    full_tokens = ollama_client.count_tokens(full_prompt)   # grows each turn!
    new_tokens  = ollama_client.count_tokens(req.message)   # always just the question
    output_tokens = left_result.response_tokens
    # Tokens that are "cached" = everything except the new message
    cached_tokens = max(0, full_tokens - new_tokens)

    # ── TOKEN-BASED COST (industry standard) ─────────────────────────────
    # LEFT: charged for ALL input tokens + output tokens
    # RIGHT (cache hit): charged for NEW tokens only + output (prefix is FREE)
    # RIGHT (cache miss): same as left
    tier = req.pricing_tier
    left_cost = settings.token_cost(full_tokens, output_tokens, tier)

    left_metrics = {
        "ttft_ms":        round(left_result.ttft_ms, 1),
        "total_ms":       round(left_result.total_ms, 1),
        "tokens_sent":    full_tokens,          # ← grows each turn (visible to audience!)
        "cost_usd":       round(max(0.0001, left_cost), 6),
        "source":         "GPU_COMPUTED",
        "infinia_latency_ms": None,
        "response_tokens":    left_result.response_tokens,
        "history_turns":      len(history),
    }

    # ── Right Panel: Infinia Cache ───────────────────────────────────────
    if cache_hit and cached_data:
        # ✅ CACHE HIT — served from DDN Infinia
        # RIGHT panel cost: only new message tokens charged (prefix is FREE/discounted)
        # This is the KEY insight: provider doesn't charge you for tokens already cached
        response_text = cached_data.get("response", left_result.response)
        right_cost = settings.cached_token_cost(
            cached_tokens=cached_tokens,   # these are FREE (self-hosted) or discounted (cloud)
            new_tokens=new_tokens,          # only the actual question tokens
            output_tokens=output_tokens,    # output same regardless of cache
            tier=tier
        )
        # Add a tiny S3 GET cost (negligible but real: ~$0.0000004/request)
        right_cost += 0.0000004

        right_metrics = {
            "ttft_ms":            round(infinia_check_latency, 1),
            "total_ms":           round(infinia_check_latency, 1),
            "tokens_sent":        new_tokens,       # Only the new question!
            "tokens_cached":      cached_tokens,    # How many were FREE
            "cost_usd":           round(right_cost, 8),
            "source":             "INFINIA_CACHE",
            "infinia_latency_ms": round(infinia_check_latency, 1),
            "response_tokens":    output_tokens,
            "cache_key_preview":  cache_key[:8] + "...",
            "history_turns":      len(history),
            "pricing_tier":       tier,
        }
        store_meta = object_meta   # already have the metadata from the GET
        store_meta["operation"] = "GET"
    else:
        # ◯ CACHE MISS — first time this question was asked
        # Compute fresh, then STORE in Infinia so next ask hits
        response_text = left_result.response
        right_cost = left_cost  # same cost on first miss

        store_meta = kv_cache.store(cache_key, {
            "response":      response_text,
            "context":       left_result.context,
            "full_tokens":   full_tokens,
            "compute_ms":    left_result.total_ms,
            "query":         req.message,
        })
        store_meta["operation"] = "PUT"

        right_metrics = {
            "ttft_ms":            round(left_result.ttft_ms, 1),
            "total_ms":           round(left_result.total_ms, 1),
            "tokens_sent":        full_tokens,
            "cost_usd":           round(right_cost, 8),
            "source":             "FIRST_MISS_STORED",   # ← clearer label
            "infinia_latency_ms": round(infinia_check_latency, 1),
            "store_latency_ms":   round(store_meta.get("store_latency_ms", 0), 1),
            "response_tokens":    output_tokens,
            "cache_key_preview":  cache_key[:8] + "...",
            "history_turns":      len(history),
        }

    # ── Update session history ────────────────────────────────────────────
    session["history"].append({"user": req.message, "assistant": response_text})

    # ── Savings ───────────────────────────────────────────────────────────
    savings_usd = max(0, left_metrics["cost_usd"] - right_metrics["cost_usd"])
    savings_pct = round(savings_usd / max(0.000000001, left_metrics["cost_usd"]) * 100, 1)
    speedup = round(left_metrics["ttft_ms"] / max(0.1, right_metrics["ttft_ms"]), 1)

    # Get pricing tier label for UI
    tier_info = settings.PRICING_TIERS.get(tier, settings.PRICING_TIERS["self_hosted_h100"])

    return {
        "response":  response_text,
        "cache_hit": cache_hit,
        "cache_key": cache_key[:8] + "...",
        "left":      left_metrics,
        "right":     right_metrics,
        "infinia_object": {
            "operation":      store_meta.get("operation", "PUT"),
            "s3_key":         store_meta.get("s3_key", f"kvcache/{cache_key}.json"),
            "s3_bucket":      store_meta.get("s3_bucket", settings.infinia_bucket),
            "s3_endpoint":    store_meta.get("s3_endpoint", settings.infinia_endpoint),
            "size_kb":        store_meta.get("size_kb", 0),
            "size_bytes":     store_meta.get("size_bytes", 0),
            "cached_at":      store_meta.get("cached_at", ""),
            "context_tokens": store_meta.get("context_tokens", 0),
            "query_preview":  store_meta.get("query_preview", req.message[:80]),
            "response_preview": store_meta.get("response_preview", response_text[:120] + "..."),
            "full_tokens":    store_meta.get("full_tokens", full_tokens),
            "compute_ms":     store_meta.get("compute_ms", left_result.total_ms),
            "store_latency_ms": store_meta.get("store_latency_ms", 0),
        },
        "savings": {
            "cost_usd":     round(savings_usd, 8),
            "pct":          savings_pct,
            "speedup_x":    speedup,
            "tokens_saved": cached_tokens if cache_hit else 0,
            "input_tokens_billed_left":  full_tokens,
            "input_tokens_billed_right": new_tokens if cache_hit else full_tokens,
        },
        "pricing": {
            "tier":           tier,
            "tier_label":     tier_info["label"],
            "input_per_1m":   tier_info["input_per_1m"],
            "output_per_1m":  tier_info["output_per_1m"],
            "cache_discount": tier_info["cache_discount"],
        },
        "session_stats": {
            "turns": len(session["history"]),
        }
    }


@chat_router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    if session_id in _sessions:
        del _sessions[session_id]
    return {"success": True}


# ── Prefix Multiplier ─────────────────────────────────────────────────────────

@prefix_router.get("/scenarios")
async def get_scenarios():
    return {
        "scenarios": {
            k: {
                "name": v["name"],
                "icon": v["icon"],
                "description": v["description"],
                "daily_requests": v["daily_requests"],
                "system_tokens": len(v["system_prompt"]) // 4,
                "example_queries": v["example_queries"],
            }
            for k, v in SCENARIOS.items()
        }
    }


@prefix_router.post("/seed")
async def seed_prefix(req: SeedRequest):
    """
    Seed a scenario's system prompt context into DDN Infinia.
    This generates the KV context state and stores it as an S3 object.
    The REAL operation: Ollama generates, we store context[] in Infinia.
    """
    if req.use_case not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown use case: {req.use_case}")

    scenario = SCENARIOS[req.use_case]
    system_prompt = scenario["system_prompt"]
    system_tokens = len(system_prompt) // 4

    # Generate KV context for the system prompt
    seed_prompt = system_prompt + "\n\nAcknowledge you have received and understood this context in one sentence."

    try:
        t0 = time.perf_counter()
        result = ollama_client.generate(seed_prompt)
        compute_ms = (time.perf_counter() - t0) * 1000
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama error: {e}")

    # Store KV context in Infinia (real S3 PUT)
    store_ms = kv_cache.store_prefix(req.use_case, result.context, system_prompt)
    context_size_kb = round(len(str(result.context)) / 1024, 1)

    return {
        "success": True,
        "use_case": req.use_case,
        "scenario_name": scenario["name"],
        "system_tokens": system_tokens,
        "context_tokens": len(result.context),
        "context_size_kb": context_size_kb,
        "compute_time_ms": round(compute_ms, 1),
        "infinia_store_ms": round(store_ms, 1),
        "infinia_bucket": settings.infinia_bucket,
        "infinia_key": f"kvcache/prefix/{req.use_case}.json",
    }


@prefix_router.post("/run")
async def run_prefix(req: PrefixRunRequest):
    """
    Run a query against a seeded prefix scenario.
    Compares: full recompute vs Infinia-cached prefix.
    This is the core demonstration of KV cache savings.
    """
    if req.use_case not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown use case: {req.use_case}")

    scenario = SCENARIOS[req.use_case]
    system_prompt = scenario["system_prompt"]

    # ── WITHOUT Cache: Full prompt every time ─────────────────────────────
    full_prompt = system_prompt + f"\n\nQuestion: {req.query}"
    full_tokens = ollama_client.count_tokens(full_prompt)
    new_tokens = ollama_client.count_tokens(req.query)

    try:
        t_nocache = time.perf_counter()
        result_nocache = ollama_client.generate(full_prompt)
        nocache_ms = (time.perf_counter() - t_nocache) * 1000
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama error: {e}")

    # ── WITH Cache: Retrieve prefix from Infinia + query only ────────────
    prefix_data, infinia_latency = kv_cache.get_prefix(req.use_case)

    if prefix_data:
        cached_context = prefix_data.get("context", [])
        try:
            t_cached = time.perf_counter()
            # Send ONLY the question, with cached KV context from Infinia
            result_cached = ollama_client.generate(req.query, context=cached_context)
            ollama_cached_ms = (time.perf_counter() - t_cached) * 1000
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Ollama cache error: {e}")

        with_cache_ms = infinia_latency + ollama_cached_ms
        cache_source = "INFINIA_HIT"
        cached_response = result_cached.response
    else:
        with_cache_ms = nocache_ms
        ollama_cached_ms = nocache_ms
        cache_source = "MISS_SEED_FIRST"
        cached_response = result_nocache.response
        infinia_latency = 0.0

    # ── Cost calculation (TOKEN-BASED) ─────────────────────────────────────────
    # Without cache: pay for ALL system prompt + question tokens
    # With cache: pay for ONLY the question tokens (system prompt is FREE from Infinia)
    tier = "self_hosted_h100"  # can be made configurable
    output_tokens_nocache = result_nocache.response_tokens

    cost_nocache = settings.token_cost(full_tokens, output_tokens_nocache, tier)

    if prefix_data:
        output_tokens_cached = result_cached.response_tokens
        # With cache: only new_tokens are billed for input (system prompt = FREE)
        # Small Infinia S3 GET cost ($0.0000004 per request)
        cost_cached = settings.cached_token_cost(
            cached_tokens=len(system_prompt) // 4,  # the prefix we bypassed
            new_tokens=new_tokens,
            output_tokens=output_tokens_cached,
            tier=tier
        ) + 0.0000004
    else:
        cost_cached = cost_nocache

    savings_usd = max(0, cost_nocache - cost_cached)
    savings_pct = round(savings_usd / max(0.000001, cost_nocache) * 100, 1)
    speedup = round(nocache_ms / max(0.1, with_cache_ms), 1)

    # Scale projections
    scale = scenario["daily_requests"]

    return {
        "no_cache": {
            "time_ms": round(nocache_ms, 1),
            "ttft_ms": round(result_nocache.ttft_ms, 1),
            "tokens_sent": full_tokens,
            "cost_usd": round(cost_nocache, 6),
            "response": result_nocache.response,
        },
        "with_cache": {
            "time_ms": round(with_cache_ms, 1),
            "infinia_latency_ms": round(infinia_latency, 1),
            "ollama_time_ms": round(ollama_cached_ms, 1),
            "tokens_sent": new_tokens if prefix_data else full_tokens,
            "cost_usd": round(cost_cached, 6),
            "source": cache_source,
            "response": cached_response,
            "infinia_key": f"kvcache/prefix/{req.use_case}.json",
        },
        "savings": {
            "time_ms": round(max(0, nocache_ms - with_cache_ms), 1),
            "cost_usd": round(savings_usd, 6),
            "pct": savings_pct,
            "speedup_x": speedup,
            "tokens_saved": max(0, full_tokens - new_tokens) if prefix_data else 0,
        },
        "scale": {
            "daily_requests": scale,
            "monthly_savings_usd": round(savings_usd * scale * 30, 2),
            "annual_savings_usd": round(savings_usd * scale * 365, 2),
            "gpu_hours_saved_monthly": round(max(0, nocache_ms - with_cache_ms) / 1000 / 3600 * scale * 30, 1),
        },
        "request_number": req.request_number,
    }


# ── Cache Stats ───────────────────────────────────────────────────────────────

@cache_router.get("/stats")
async def cache_stats():
    return kv_cache.get_stats()


@cache_router.delete("/clear")
async def clear_cache():
    """Clear all sessions (not Infinia objects — those persist)."""
    _sessions.clear()
    return {"success": True, "message": "Session cache cleared (Infinia objects preserved)"}
