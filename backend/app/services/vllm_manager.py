"""
DDN KV Cache Observatory — vLLM Server Manager
Manages the vLLM subprocess: start, stop, health polling.
vLLM must be stopped when not benchmarking so Ollama (Chat Observatory) can use GPU.
"""
import asyncio
import os
import logging
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

# ── State ─────────────────────────────────────────────────────────────────────
_vllm_process = None
_vllm_status = "stopped"   # stopped | starting | running | stopping | error
_vllm_log_lines: list[str] = []

VLLM_PORT = 11000
VLLM_HEALTH_URL = f"http://localhost:{VLLM_PORT}/health"
MODEL_PATH = os.path.expanduser("~/models/Llama-3.1-8B-Instruct")

VLLM_CMD = [
    "python", "-m", "vllm.entrypoints.openai.api_server",
    "--model", MODEL_PATH,
    "--served-model-name", "meta-llama/Llama-3.1-8B-Instruct",
    "--enable-prefix-caching",
    "--enforce-eager",
    "--port", str(VLLM_PORT),
    "--max-model-len", "16384",
    "--gpu-memory-utilization", "0.85",
]


def _build_env() -> dict:
    env = os.environ.copy()
    env["VLLM_USE_V1"] = "0"
    dynamo_bin = os.path.expanduser("~/dynamo-env/bin")
    if os.path.exists(dynamo_bin):
        env["PATH"] = f"{dynamo_bin}:{env.get('PATH', '')}"
        env["VIRTUAL_ENV"] = os.path.expanduser("~/dynamo-env")
    return env


async def start_vllm() -> dict:
    global _vllm_process, _vllm_status, _vllm_log_lines
    if _vllm_status in ("starting", "running"):
        return {"status": _vllm_status, "message": "vLLM is already running"}

    # Quick health check — maybe it's already up from a previous session
    if await _is_healthy():
        _vllm_status = "running"
        return {"status": "running", "message": "vLLM was already reachable"}

    _vllm_status = "starting"
    _vllm_log_lines = []
    logger.info(f"Starting vLLM: {' '.join(VLLM_CMD)}")

    try:
        _vllm_process = await asyncio.create_subprocess_exec(
            *VLLM_CMD,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=_build_env(),
        )
        asyncio.create_task(_watch_startup())
        asyncio.create_task(_drain_output())
        return {"status": "starting", "pid": _vllm_process.pid,
                "message": "vLLM starting — model loading (~60s)"}
    except FileNotFoundError:
        _vllm_status = "error"
        return {"status": "error", "message": "python / vLLM not found. Is dynamo-env active?"}
    except Exception as e:
        _vllm_status = "error"
        return {"status": "error", "message": str(e)}


async def stop_vllm() -> dict:
    global _vllm_process, _vllm_status
    _vllm_status = "stopping"
    logger.info("Stopping vLLM server…")

    # Graceful terminate → force kill
    if _vllm_process and _vllm_process.returncode is None:
        try:
            _vllm_process.terminate()
            await asyncio.sleep(3)
            if _vllm_process.returncode is None:
                _vllm_process.kill()
                await _vllm_process.wait()
        except Exception as e:
            logger.warning(f"vLLM terminate error: {e}")

    # Belt-and-suspenders: kill any lingering vllm processes
    try:
        proc = await asyncio.create_subprocess_shell(
            "pkill -f 'vllm.entrypoints.openai' 2>/dev/null; pkill -f 'VLLM::EngineCore' 2>/dev/null; true",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
    except Exception:
        pass

    _vllm_process = None
    _vllm_status = "stopped"
    logger.info("vLLM stopped. GPU VRAM freed for Ollama.")
    return {"status": "stopped", "message": "vLLM stopped — GPU freed for Chat Observatory"}


def get_status() -> dict:
    pid = _vllm_process.pid if _vllm_process and _vllm_process.returncode is None else None
    return {
        "status": _vllm_status,
        "pid": pid,
        "port": VLLM_PORT,
        "model": "meta-llama/Llama-3.1-8B-Instruct",
        "recent_logs": _vllm_log_lines[-10:],
    }


# ── Internal helpers ───────────────────────────────────────────────────────────

async def _is_healthy() -> bool:
    """Non-blocking health check using stdlib urllib in a thread executor."""
    def _check():
        try:
            with urllib.request.urlopen(VLLM_HEALTH_URL, timeout=2) as r:
                return r.status == 200
        except Exception:
            return False
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _check)


async def _watch_startup():
    """Poll /health until vLLM is ready or times out (120s)."""
    global _vllm_status
    for _ in range(120):
        await asyncio.sleep(1)
        if _vllm_process is None or _vllm_process.returncode is not None:
            _vllm_status = "error"
            return
        if await _is_healthy():
            _vllm_status = "running"
            logger.info(f"vLLM is ready on port {VLLM_PORT}")
            return
    _vllm_status = "error"
    logger.error("vLLM health check timed out after 120s")


async def _drain_output():
    """Read stdout so the pipe buffer doesn't block the process."""
    global _vllm_log_lines
    if not _vllm_process or not _vllm_process.stdout:
        return
    try:
        async for raw in _vllm_process.stdout:
            line = raw.decode("utf-8", errors="replace").rstrip()
            _vllm_log_lines.append(line)
            if len(_vllm_log_lines) > 200:
                _vllm_log_lines = _vllm_log_lines[-200:]
    except Exception:
        pass
