"""
DDN KV Cache Observatory — vLLM Status Monitor
Simple health-check only. vLLM is started manually by the operator from WSL terminal.
UI polls this endpoint to detect when vLLM is running on port 11000.

Working command (copy from UI):
  source ~/dynamo-env/bin/activate
  VLLM_USE_FLASHINFER_SAMPLER=0 python -m vllm.entrypoints.openai.api_server \
    --model ~/models/Llama-3.1-8B-Instruct \
    --served-model-name "meta-llama/Llama-3.1-8B-Instruct" \
    --enable-prefix-caching --enforce-eager --port 11000 \
    --max-model-len 16384 --kv-cache-memory=4859239424
"""
import urllib.request
import logging

logger = logging.getLogger(__name__)

VLLM_PORT       = 11000
VLLM_HEALTH_URL = f"http://localhost:{VLLM_PORT}/health"


def get_status() -> dict:
    """Check if vLLM is reachable on port 11000 and return status dict."""
    running = _is_healthy()
    return {
        "status": "running" if running else "stopped",
        "port": VLLM_PORT,
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "recent_logs": [],
    }


def _is_healthy() -> bool:
    """Synchronous health check — used by get_status() called from sync route."""
    try:
        with urllib.request.urlopen(VLLM_HEALTH_URL, timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


# ── Legacy stubs so routes.py import still works ──────────────────────────────
async def start_vllm() -> dict:
    """No-op — vLLM is started manually by the operator."""
    return {"status": "manual", "message": "Start vLLM from WSL terminal. See UI for command."}


async def stop_vllm() -> dict:
    """No-op — vLLM is stopped manually by the operator."""
    return {"status": "manual", "message": "Stop vLLM from WSL terminal (Ctrl+C)."}
