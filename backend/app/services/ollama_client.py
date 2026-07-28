"""
Ollama Client for DDN KV Cache Observatory
Uses Ollama's /api/generate with context parameter for real KV state offloading.
The 'context' response field contains the KV state token IDs that we store in Infinia.
"""
import time
import logging
from typing import Optional, AsyncGenerator

import requests
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class GenerateResult:
    def __init__(self, response: str, context: list, ttft_ms: float,
                 total_ms: float, prompt_tokens: int, response_tokens: int):
        self.response = response
        self.context = context          # KV state — store this in Infinia!
        self.ttft_ms = ttft_ms          # Time to first token
        self.total_ms = total_ms        # Total generation time
        self.prompt_tokens = prompt_tokens
        self.response_tokens = response_tokens


class OllamaClient:
    """Client for Ollama inference with KV state support."""

    @property
    def base_url(self) -> str:
        return settings.ollama_url

    @property
    def model(self) -> str:
        return settings.ollama_model

    def count_tokens(self, text: str) -> int:
        """Rough token estimate: ~4 chars per token."""
        return max(1, len(text) // 4)

    def health_check(self) -> dict:
        """Check if Ollama is running and model is available."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                model_ready = any(self.model in m for m in models)
                return {
                    "available": True,
                    "models": models,
                    "target_model": self.model,
                    "model_ready": model_ready,
                }
        except Exception as e:
            return {"available": False, "error": str(e), "model_ready": False}
        return {"available": False, "model_ready": False}

    def generate(self, prompt: str, context: Optional[list] = None, num_ctx: Optional[int] = None) -> GenerateResult:
        """
        Generate a response using Ollama.
        
        If context (KV state) is provided, Ollama reuses it — real KV cache!
        This is the key mechanism: fewer tokens processed when context is reused.
        num_ctx: override Ollama's default context window (8192). Set to 32768 or higher
                 for large enterprise system prompts that would otherwise be truncated.
        """
        options: dict = {
            "temperature": 0.1,
            "num_predict": 256,
        }
        if num_ctx is not None:
            options["num_ctx"] = num_ctx

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
            "options": options,
        }
        if context:
            payload["context"] = context  # Real KV state from Infinia!

        prompt_tokens = self.count_tokens(prompt)
        if context:
            logger.info(f"Ollama generate: {prompt_tokens} new tokens + {len(context)} cached context tokens")
        else:
            logger.info(f"Ollama generate: {prompt_tokens} tokens (no cache)")

        t_start = time.perf_counter()
        ttft_ms = None
        response_parts = []
        final_context = []
        response_tokens = 0

        try:
            r = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                stream=True,
                timeout=120,
            )
            r.raise_for_status()

            for line in r.iter_lines():
                if not line:
                    continue
                import json
                chunk = json.loads(line)

                if ttft_ms is None and chunk.get("response"):
                    ttft_ms = (time.perf_counter() - t_start) * 1000

                if chunk.get("response"):
                    response_parts.append(chunk["response"])
                    response_tokens += 1

                if chunk.get("done"):
                    final_context = chunk.get("context", [])
                    break

        except Exception as e:
            logger.error(f"Ollama generate error: {e}")
            raise

        total_ms = (time.perf_counter() - t_start) * 1000
        response_text = "".join(response_parts)

        return GenerateResult(
            response=response_text,
            context=final_context,
            ttft_ms=ttft_ms or total_ms,
            total_ms=total_ms,
            prompt_tokens=prompt_tokens,
            response_tokens=response_tokens,
        )

    def gpu_info(self) -> dict:
        """Get GPU info from system."""
        try:
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,utilization.gpu",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                parts = [p.strip() for p in result.stdout.strip().split(",")]
                if len(parts) >= 4:
                    return {
                        "available": True,
                        "name": parts[0],
                        "memory_total_mb": int(parts[1]),
                        "memory_used_mb": int(parts[2]),
                        "utilization_pct": int(parts[3]),
                    }
        except Exception:
            pass
        return {"available": False}


ollama_client = OllamaClient()
