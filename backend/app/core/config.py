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
        """GPU compute cost per millisecond"""
        return self.gpu_cost_per_hour / 3_600_000


settings = Settings()
