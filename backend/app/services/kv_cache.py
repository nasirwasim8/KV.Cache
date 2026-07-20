"""
DDN Infinia KV Cache Manager
Stores and retrieves KV cache entries (conversation context) from DDN Infinia Object Store.
This is the REAL thing: actual S3 GET/PUT to Infinia, with real latency measured.
"""
import json
import time
import hashlib
import logging
from typing import Optional
from datetime import datetime

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class InfiniaKVCacheManager:
    """Manages KV cache entries stored in DDN Infinia Object Store."""

    def __init__(self):
        self._client = None
        self._hit_count = 0
        self._miss_count = 0
        self._total_bytes_stored = 0

    def _get_client(self):
        """Lazy-init S3 client."""
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.infinia_endpoint or None,
                aws_access_key_id=settings.infinia_access_key,
                aws_secret_access_key=settings.infinia_secret_key,
                region_name=settings.infinia_region,
                config=Config(
                    signature_version="s3v4",
                    retries={"max_attempts": 2, "mode": "standard"},
                    connect_timeout=5,
                    read_timeout=10,
                ),
                verify=False,  # Infinia uses self-signed certs
            )
        return self._client

    def reinit(self):
        """Re-initialize client (after config change)."""
        self._client = None

    @staticmethod
    def compute_key(messages: list, query: str) -> str:
        """SHA-256 hash of conversation context + query."""
        content = json.dumps(messages, sort_keys=True) + "|||" + query
        return hashlib.sha256(content.encode()).hexdigest()[:24]

    @staticmethod
    def compute_prefix_key(use_case: str) -> str:
        return f"prefix/{use_case}"

    def check(self, key: str) -> tuple[bool, Optional[dict], float, dict]:
        """
        Check Infinia for cached entry.
        Returns: (hit, data, latency_ms, object_meta)
        object_meta contains S3 metadata: size, key, cached_at — for the UI inspector.
        """
        object_key = f"kvcache/{key}.json"
        t0 = time.perf_counter()
        try:
            client = self._get_client()
            response = client.get_object(
                Bucket=settings.infinia_bucket,
                Key=object_key
            )
            body = response["Body"].read()
            data = json.loads(body)
            latency_ms = (time.perf_counter() - t0) * 1000
            self._hit_count += 1
            object_meta = {
                "s3_key":       object_key,
                "s3_bucket":    settings.infinia_bucket,
                "s3_endpoint":  settings.infinia_endpoint,
                "size_bytes":   len(body),
                "size_kb":      round(len(body) / 1024, 1),
                "cached_at":    data.get("_cached_at", "unknown"),
                "context_tokens": len(data.get("context", [])),
                "query_preview":  data.get("query", "")[:80],
                "response_preview": data.get("response", "")[:120] + "...",
                "full_tokens":  data.get("full_tokens", 0),
                "compute_ms":   data.get("compute_ms", 0),
            }
            logger.info(f"CACHE HIT: {key[:8]}... size={len(body)}B latency={latency_ms:.1f}ms")
            return True, data, latency_ms, object_meta
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                latency_ms = (time.perf_counter() - t0) * 1000
                self._miss_count += 1
                logger.info(f"CACHE MISS: {key[:8]}... latency={latency_ms:.1f}ms")
                return False, None, latency_ms, {}
            raise
        except Exception as e:
            latency_ms = (time.perf_counter() - t0) * 1000
            logger.warning(f"Cache check error: {e}")
            return False, None, latency_ms, {}

    def store(self, key: str, data: dict) -> dict:
        """
        Store cache entry in Infinia.
        Returns rich StoreMeta dict with S3 details for the UI inspector.
        """
        object_key = f"kvcache/{key}.json"
        cached_at = datetime.utcnow().isoformat()
        data["_cached_at"] = cached_at
        data["_key"] = key
        body = json.dumps(data).encode()
        t0 = time.perf_counter()
        try:
            client = self._get_client()
            client.put_object(
                Bucket=settings.infinia_bucket,
                Key=object_key,
                Body=body,
                ContentType="application/json",
            )
            store_ms = (time.perf_counter() - t0) * 1000
            self._total_bytes_stored += len(body)
            logger.info(f"CACHE STORE: {key[:8]}... size={len(body)}B latency={store_ms:.1f}ms")
            return {
                "store_latency_ms":  round(store_ms, 1),
                "s3_key":            object_key,
                "s3_bucket":         settings.infinia_bucket,
                "s3_endpoint":       settings.infinia_endpoint,
                "size_bytes":        len(body),
                "size_kb":           round(len(body) / 1024, 1),
                "cached_at":         cached_at,
                "context_tokens":    len(data.get("context", [])),
                "query_preview":     data.get("query", "")[:80],
                "response_preview":  data.get("response", "")[:120] + "...",
                "full_tokens":       data.get("full_tokens", 0),
                "compute_ms":        data.get("compute_ms", 0),
            }
        except Exception as e:
            logger.error(f"Cache store error: {e}")
            return {"store_latency_ms": 0.0, "error": str(e)}

    def store_prefix(self, use_case: str, context: list, system_prompt: str) -> float:
        """Store a scenario prefix (system prompt KV state) in Infinia."""
        key = self.compute_prefix_key(use_case)
        data = {
            "use_case": use_case,
            "context": context,
            "system_prompt_preview": system_prompt[:200] + "...",
            "system_tokens": len(system_prompt) // 4,
            "context_size": len(context),
        }
        return self.store(key, data)

    def get_prefix(self, use_case: str) -> tuple[Optional[dict], float]:
        """Retrieve a scenario prefix from Infinia. Returns (data, latency_ms)."""
        key = self.compute_prefix_key(use_case)
        hit, data, latency, _ = self.check(key)  # _ = object_meta (not needed here)
        if hit:
            return data, latency
        return None, latency

    def get_stats(self) -> dict:
        """Get cache statistics from Infinia."""
        try:
            client = self._get_client()
            paginator = client.get_paginator("list_objects_v2")
            pages = paginator.paginate(
                Bucket=settings.infinia_bucket,
                Prefix="kvcache/"
            )
            objects = []
            total_size = 0
            for page in pages:
                for obj in page.get("Contents", []):
                    objects.append({
                        "key": obj["Key"],
                        "size_bytes": obj["Size"],
                        "last_modified": obj["LastModified"].isoformat(),
                    })
                    total_size += obj["Size"]
            return {
                "total_objects": len(objects),
                "total_size_bytes": total_size,
                "total_size_kb": round(total_size / 1024, 1),
                "hit_count": self._hit_count,
                "miss_count": self._miss_count,
                "hit_rate": round(
                    self._hit_count / max(1, self._hit_count + self._miss_count) * 100, 1
                ),
                "objects": objects[-20:],  # last 20
            }
        except Exception as e:
            logger.error(f"Stats error: {e}")
            return {
                "error": str(e),
                "hit_count": self._hit_count,
                "miss_count": self._miss_count,
            }

    def test_connection(self) -> dict:
        """Test Infinia connectivity. Returns {success, latency_ms, message}."""
        t0 = time.perf_counter()
        try:
            client = self._get_client()
            client.head_bucket(Bucket=settings.infinia_bucket)
            latency_ms = (time.perf_counter() - t0) * 1000
            return {"success": True, "latency_ms": round(latency_ms, 2), "message": "Connected"}
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "403":
                return {"success": False, "latency_ms": 0, "message": "Access denied — check credentials"}
            elif code == "404":
                return {"success": False, "latency_ms": 0, "message": f"Bucket '{settings.infinia_bucket}' not found"}
            return {"success": False, "latency_ms": 0, "message": str(e)}
        except Exception as e:
            return {"success": False, "latency_ms": 0, "message": str(e)}


kv_cache = InfiniaKVCacheManager()
