"""
DDN KV Cache Observatory - Configuration
"""
import os
import json
from pathlib import Path

CONFIG_FILE = Path(__file__).parent.parent.parent / "kv_config.json"


class Settings:
    def __init__(self):
        self.infinia_endpoint: str = ""
        self.infinia_access_key: str = ""
        self.infinia_secret_key: str = ""
        self.infinia_bucket: str = "ddn-kv-cache-01"
        self.infinia_region: str = "us-east-1"
        self.ollama_url: str = "http://localhost:11434"
        self.ollama_model: str = "llama3.2:3b"
        # GPU cost rate (H100 market rate $/hour)
        self.gpu_cost_per_hour: float = 2.80
        # Storage cost ($/GB/month → per ms)
        self.storage_cost_per_gb_month: float = 0.023
        self._load_from_file()

    def _load_from_file(self):
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE) as f:
                    data = json.load(f)
                self.infinia_endpoint = data.get("infinia_endpoint", self.infinia_endpoint)
                self.infinia_access_key = data.get("infinia_access_key", self.infinia_access_key)
                self.infinia_secret_key = data.get("infinia_secret_key", self.infinia_secret_key)
                self.infinia_bucket = data.get("infinia_bucket", self.infinia_bucket)
                self.infinia_region = data.get("infinia_region", self.infinia_region)
                self.ollama_url = data.get("ollama_url", self.ollama_url)
                self.ollama_model = data.get("ollama_model", self.ollama_model)
            except Exception as e:
                print(f"Warning: Could not load config file: {e}")

    def save(self):
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w") as f:
            json.dump({
                "infinia_endpoint": self.infinia_endpoint,
                "infinia_access_key": self.infinia_access_key,
                "infinia_secret_key": self.infinia_secret_key,
                "infinia_bucket": self.infinia_bucket,
                "infinia_region": self.infinia_region,
                "ollama_url": self.ollama_url,
                "ollama_model": self.ollama_model,
            }, f, indent=2)

    def cost_per_ms(self) -> float:
        """GPU compute cost per millisecond (kept for prefix multiplier GPU cost path)"""
        return self.gpu_cost_per_hour / 3_600_000

    # ── Token-based pricing tiers ───────────────────────────────────────────
    # Standard industry model: $ per 1M tokens
    # Source: real provider pricing (July 2026)
    PRICING_TIERS = {
        "cloud_openai": {
            "label": "Cloud API (GPT-4o equivalent)",
            "input_per_1m": 2.50,    # $/1M input tokens
            "output_per_1m": 10.00,  # $/1M output tokens
            "cache_discount": 0.50,  # 50% discount on cached input (OpenAI style)
        },
        "cloud_anthropic": {
            "label": "Cloud API (Claude 3.5 equivalent)",
            "input_per_1m": 3.00,
            "output_per_1m": 15.00,
            "cache_discount": 0.10,  # 90% discount (pay only 10% for cached)
        },
        "self_hosted_h100": {
            "label": "Self-hosted H100 (Llama)",
            "input_per_1m": 0.70,    # H100 amortized at $3/hr, ~1500 tok/s
            "output_per_1m": 2.80,   # output is slower (autoregressive)
            "cache_discount": 0.0,   # 100% free — cached tokens skipped entirely
        },
    }

    def token_cost(self, input_tokens: int, output_tokens: int, tier: str = "self_hosted_h100") -> float:
        """Calculate cost for a request using token-based pricing."""
        p = self.PRICING_TIERS.get(tier, self.PRICING_TIERS["self_hosted_h100"])
        return (input_tokens / 1_000_000 * p["input_per_1m"]
                + output_tokens / 1_000_000 * p["output_per_1m"])

    def cached_token_cost(self, cached_tokens: int, new_tokens: int, output_tokens: int, tier: str = "self_hosted_h100") -> float:
        """
        Cost when KV cache is active:
        - Cached prefix tokens: FREE (self-hosted) or discounted (cloud)
        - New message tokens: full price
        - Output tokens: full price (generation is same regardless)
        """
        p = self.PRICING_TIERS.get(tier, self.PRICING_TIERS["self_hosted_h100"])
        cached_cost = cached_tokens / 1_000_000 * p["input_per_1m"] * p["cache_discount"]
        new_cost    = new_tokens   / 1_000_000 * p["input_per_1m"]
        output_cost = output_tokens / 1_000_000 * p["output_per_1m"]
        return cached_cost + new_cost + output_cost


settings = Settings()
