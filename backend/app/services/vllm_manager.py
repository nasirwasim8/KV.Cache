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
import asyncio
import os

logger = logging.getLogger(__name__)

VLLM_PORT       = 11000
VLLM_HEALTH_URL = f"http://localhost:{VLLM_PORT}/health"
PM2_BIN         = "/usr/bin/pm2" if os.path.exists("/usr/bin/pm2") else "pm2"


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


async def start_vllm() -> dict:
    """Start the vLLM inference server via PM2."""
    logger.info("Starting vLLM server via PM2...")
    try:
        proc = await asyncio.create_subprocess_exec(
            PM2_BIN, "start", "ddn-vllm",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        out_msg = stdout.decode().strip()
        logger.info(f"PM2 start output: {out_msg}")
        return {"status": "starting", "message": "vLLM starting via PM2 (~60s to warm up model & KV cache)"}
    except Exception as e:
        logger.error(f"Failed to start vLLM via PM2: {e}")
        return {"status": "error", "message": str(e)}


async def stop_vllm() -> dict:
    """Stop the vLLM inference server via PM2 and free GPU memory for Ollama."""
    logger.info("Stopping vLLM server via PM2...")
    try:
        proc = await asyncio.create_subprocess_exec(
            PM2_BIN, "stop", "ddn-vllm",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.communicate()
    except Exception as e:
        logger.warning(f"PM2 stop error: {e}")

    # Ensure any detached vLLM child engines are cleanly terminated
    try:
        pkill = await asyncio.create_subprocess_shell("pkill -9 -f 'VLLM::EngineCore'")
        await pkill.communicate()
    except Exception as e:
        logger.warning(f"pkill error: {e}")

    await asyncio.sleep(1)
    running = _is_healthy()
    return {
        "status": "stopped" if not running else "stopping",
        "message": "vLLM stopped and GPU memory freed." if not running else "vLLM is shutting down."
    }
