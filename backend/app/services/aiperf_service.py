"""
DDN KV Cache Observatory — AIperf Service
Manages live aiperf benchmark runs: subprocess lifecycle, SSE streaming, result parsing.
"""
import asyncio
import json
import os
import re
import time
import uuid
import logging
from typing import AsyncGenerator, Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)

# ── Run registry ─────────────────────────────────────────────────────────────
# Keyed by run_id → { process, status, output_lines, results, started_at }
_runs: dict = {}


@dataclass
class AIperfConfig:
    model: str = "meta-llama/Llama-3.1-8B-Instruct"
    tokenizer: str = ""                      # defaults to model path if empty
    endpoint_url: str = "http://localhost:8000"
    endpoint_type: str = "chat"
    context_tokens: int = 16000
    output_tokens_mean: int = 100
    output_tokens_stddev: int = 0
    concurrency: int = 1
    request_count: int = 50
    warmup_count: int = 2
    streaming: bool = True
    dataset_strategy: str = "shuffle"
    num_prefix_prompts: int = 1
    synthetic_input_tokens_mean: int = 1
    synthetic_input_tokens_stddev: int = 0


@dataclass
class AIperfResults:
    ttft_avg_ms: float = 0.0
    ttft_min_ms: float = 0.0
    ttft_max_ms: float = 0.0
    ttft_p50_ms: float = 0.0
    ttft_p90_ms: float = 0.0
    ttft_p99_ms: float = 0.0
    ttst_avg_ms: float = 0.0
    request_latency_avg_ms: float = 0.0
    request_latency_p99_ms: float = 0.0
    itl_avg_ms: float = 0.0
    output_throughput_per_user: float = 0.0
    e2e_throughput_per_user: float = 0.0
    output_token_throughput: float = 0.0
    request_throughput: float = 0.0
    output_seq_len: float = 0.0
    input_seq_len: float = 0.0
    request_count: int = 0
    benchmark_duration_sec: float = 0.0
    csv_path: str = ""
    json_path: str = ""


def build_aiperf_command(cfg: AIperfConfig, output_dir: str) -> list[str]:
    tokenizer = cfg.tokenizer if cfg.tokenizer else cfg.model
    cmd = [
        "aiperf", "profile",
        "--model", cfg.model,
        "--tokenizer", tokenizer,
        "--endpoint-type", cfg.endpoint_type,
        "--url", cfg.endpoint_url,
        "--concurrency", str(cfg.concurrency),
        "--request-count", str(cfg.request_count),
        "--num-prefix-prompts", str(cfg.num_prefix_prompts),
        "--synthetic-input-tokens-mean", str(cfg.synthetic_input_tokens_mean),
        "--synthetic-input-tokens-stddev", str(cfg.synthetic_input_tokens_stddev),
        "--prefix-prompt-length", str(cfg.context_tokens),
        "--output-tokens-mean", str(cfg.output_tokens_mean),
        "--output-tokens-stddev", str(cfg.output_tokens_stddev),
        "--dataset-sampling-strategy", cfg.dataset_strategy,
        "--warmup-request-count", str(cfg.warmup_count),
        "--artifact-dir", output_dir,
    ]
    if cfg.streaming:
        cmd.append("--streaming")
    return cmd


def _parse_metric_line(line: str) -> Optional[dict]:
    """
    Parse a table row from aiperf output like:
    "  Time to First Token (ms)   |  1021.93 |  967.99 |  1275.53 |..."
    Returns a partial AIperfResults dict update, or None.
    """
    line = line.strip()
    result = {}

    patterns = [
        (r"Time to First Token \(ms\)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)",
         ["ttft_avg_ms", "ttft_min_ms", "ttft_max_ms", "ttft_p99_ms", "ttft_p90_ms", "ttft_p50_ms"]),
        (r"Time to Second Token \(ms\)\s+(\d+\.?\d*)",
         ["ttst_avg_ms"]),
        (r"Request Latency \(ms\)\s+(\d+\.?\d*)\s+\S+\s+\S+\s+(\d+\.?\d*)",
         ["request_latency_avg_ms", "request_latency_p99_ms"]),
        (r"Inter-Token Latency \(ms\)\s+(\d+\.?\d*)",
         ["itl_avg_ms"]),
        (r"Output Token Throughput Per User.*?(\d+\.?\d*)",
         ["output_throughput_per_user"]),
        (r"E2E Output Token Throughput.*?(\d+\.?\d*)",
         ["e2e_throughput_per_user"]),
        (r"Output Token Throughput \(tokens/sec\)\s+(\d+\.?\d*)",
         ["output_token_throughput"]),
        (r"Request Throughput \(requests/sec\)\s+(\d+\.?\d*)",
         ["request_throughput"]),
        (r"Output Sequence Length \(tokens\)\s+(\d+\.?\d*)",
         ["output_seq_len"]),
        (r"Input Sequence Length \(tokens\)\s+(\S+)",
         ["input_seq_len"]),
        (r"Request Count.*?(\d+)",
         ["request_count"]),
        (r"Benchmark Duration:\s+(\d+\.?\d*)\s+sec",
         ["benchmark_duration_sec"]),
    ]

    for pattern, keys in patterns:
        m = re.search(pattern, line)
        if m:
            for i, key in enumerate(keys):
                try:
                    val = m.group(i + 1).replace(",", "")
                    result[key] = float(val)
                except Exception:
                    pass
    return result if result else None


async def start_run(cfg: AIperfConfig) -> str:
    """Start an aiperf benchmark run. Returns run_id."""
    run_id = str(uuid.uuid4())[:8]
    output_dir = os.path.expanduser(f"~/aiperf_runs/{run_id}")
    os.makedirs(output_dir, exist_ok=True)

    cmd = build_aiperf_command(cfg, output_dir)
    cmd_str = " ".join(cmd)

    # Activate the dynamo-env Python environment
    env = os.environ.copy()
    dynamo_env_bin = os.path.expanduser("~/dynamo-env/bin")
    if os.path.exists(dynamo_env_bin):
        env["PATH"] = f"{dynamo_env_bin}:{env.get('PATH', '')}"
        env["VIRTUAL_ENV"] = os.path.expanduser("~/dynamo-env")

    _runs[run_id] = {
        "status": "starting",
        "config": asdict(cfg),
        "command": cmd_str,
        "output_lines": [],
        "results": None,
        "started_at": time.time(),
        "output_dir": output_dir,
        "process": None,
    }

    logger.info(f"[{run_id}] Starting aiperf: {cmd_str}")

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
        )
        _runs[run_id]["process"] = process
        _runs[run_id]["status"] = "running"

        # Background task to read output
        asyncio.create_task(_read_output(run_id, process, output_dir))
    except FileNotFoundError:
        _runs[run_id]["status"] = "error"
        _runs[run_id]["output_lines"].append("ERROR: aiperf not found. Is the dynamo-env activated?")

    return run_id


async def _read_output(run_id: str, process, output_dir: str):
    """Background coroutine: reads subprocess stdout and accumulates lines + partial metrics."""
    run = _runs[run_id]
    partial_results = {}

    try:
        async for raw_line in process.stdout:
            line = raw_line.decode("utf-8", errors="replace").rstrip()
            run["output_lines"].append(line)

            # Try to parse metrics from this line
            metrics = _parse_metric_line(line)
            if metrics:
                partial_results.update(metrics)
                run["partial_metrics"] = partial_results.copy()

        await process.wait()
        run["return_code"] = process.returncode

        if process.returncode == 0:
            run["status"] = "done"
            # Try to load the full JSON results written by aiperf
            results = _load_results_json(output_dir, partial_results)
            run["results"] = asdict(results) if results else partial_results
        else:
            run["status"] = "error"
    except Exception as e:
        logger.error(f"[{run_id}] Error reading output: {e}")
        run["status"] = "error"
        run["output_lines"].append(f"Internal error: {e}")


def _load_results_json(output_dir: str, fallback: dict) -> Optional[AIperfResults]:
    """Try to load aiperf's exported JSON file."""
    try:
        import glob
        pattern = os.path.join(output_dir, "**", "*aiperf*.json")
        files = glob.glob(pattern, recursive=True)
        if not files:
            return None
        with open(files[0]) as f:
            data = json.load(f)
        r = AIperfResults()
        # Map known aiperf JSON fields
        stats = data.get("stats", data)
        field_map = {
            "ttft_avg_ms": ["time_to_first_token_ms", "ttft"],
            "output_throughput_per_user": ["output_token_throughput_per_user"],
            "request_latency_avg_ms": ["request_latency_ms"],
            "benchmark_duration_sec": ["benchmark_duration"],
        }
        for attr, keys in field_map.items():
            for k in keys:
                if k in stats:
                    try:
                        setattr(r, attr, float(stats[k]))
                    except Exception:
                        pass
        r.json_path = files[0]
        return r
    except Exception:
        return None


async def stream_run(run_id: str) -> AsyncGenerator[str, None]:
    """
    SSE generator — yields JSON-encoded events as the run progresses.
    Event types:
      {"type": "log",     "line": "..."}
      {"type": "metrics", "data": {...}}
      {"type": "done",    "results": {...}, "command": "...", "duration": X}
      {"type": "error",   "message": "..."}
    """
    if run_id not in _runs:
        yield _sse({"type": "error", "message": f"Run {run_id} not found"})
        return

    run = _runs[run_id]
    sent_lines = 0
    last_metrics_sent = {}

    while True:
        # Send any new log lines
        current_lines = run["output_lines"]
        new_lines = current_lines[sent_lines:]
        for line in new_lines:
            yield _sse({"type": "log", "line": line})
            sent_lines += 1

        # Send metrics if updated
        partial = run.get("partial_metrics", {})
        if partial != last_metrics_sent:
            yield _sse({"type": "metrics", "data": partial})
            last_metrics_sent = partial.copy()

        status = run["status"]
        if status == "done":
            duration = round(time.time() - run["started_at"], 1)
            yield _sse({
                "type": "done",
                "results": run.get("results", {}),
                "command": run.get("command", ""),
                "duration_sec": duration,
            })
            return
        elif status == "error":
            yield _sse({"type": "error", "message": "aiperf exited with an error. Check logs."})
            return

        await asyncio.sleep(0.2)


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def get_run(run_id: str) -> Optional[dict]:
    return _runs.get(run_id)


def list_runs() -> list:
    return [
        {
            "run_id": rid,
            "status": r["status"],
            "started_at": r["started_at"],
            "config": r.get("config", {}),
        }
        for rid, r in _runs.items()
    ]


async def stop_run(run_id: str) -> bool:
    run = _runs.get(run_id)
    if not run:
        return False
    proc = run.get("process")
    if proc and proc.returncode is None:
        try:
            proc.terminate()
            await asyncio.sleep(0.5)
            if proc.returncode is None:
                proc.kill()
        except Exception as e:
            logger.warning(f"[{run_id}] Failed to kill process: {e}")
    run["status"] = "stopped"
    return True
