#!/usr/bin/env python3
"""
Patch LMCache S3Connector to support path-style S3 requests.

This is needed for S3-compatible endpoints where the bucket name
is in the virtual-hosted hostname (e.g., bucket.ip-address:port)
but the hostname is not DNS-resolvable (IP in subdomain).

The patch:
1. Reads s3_use_path_style from extra_config
2. When enabled, splits "bucket.host:port" → bucket + "host:port"
3. Uses bare IP as Host header (DNS-resolvable)
4. Prepends /bucket/ to all S3 object paths (path-style addressing)
"""
import re

S3_CONNECTOR = "/home/nwasim/dynamo-env/lib/python3.12/site-packages/lmcache/v1/storage_backend/connector/s3_connector.py"
S3_ADAPTER   = "/home/nwasim/dynamo-env/lib/python3.12/site-packages/lmcache/v1/storage_backend/connector/s3_adapter.py"

with open(S3_CONNECTOR, 'r') as f:
    connector_src = f.read()

with open(S3_ADAPTER, 'r') as f:
    adapter_src = f.read()

print("=== Current state of patches ===")
print("S3Connector has path-style support:", "s3_use_path_style" in connector_src)
print("S3ConnectorAdapter has path-style:", "s3_use_path_style" in adapter_src)
print()

# ─── Patch 1: s3_adapter.py — read s3_use_path_style from extra_config ───────
# Find the line that creates S3Connector and add s3_use_path_style parameter
# Current:
#     return S3Connector(
#         s3_endpoint=s3_endpoint,
#         ...
#         aws_secret_access_key=self.aws_secret_access_key,
#     )
# Target: add s3_use_path_style=... before the closing paren

OLD_ADAPTER = """        self.aws_access_key_id = extra_config.get("aws_access_key_id", None)
        self.aws_secret_access_key = extra_config.get("aws_secret_access_key", None)"""

NEW_ADAPTER = """        self.aws_access_key_id = extra_config.get("aws_access_key_id", None)
        self.aws_secret_access_key = extra_config.get("aws_secret_access_key", None)
        self.s3_use_path_style = bool(extra_config.get("s3_use_path_style", False))"""

OLD_ADAPTER_RETURN = """            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
        )"""

NEW_ADAPTER_RETURN = """            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            s3_use_path_style=self.s3_use_path_style,
        )"""

if OLD_ADAPTER in adapter_src:
    adapter_src = adapter_src.replace(OLD_ADAPTER, NEW_ADAPTER)
    print("✓ Adapter: added s3_use_path_style read from extra_config")
else:
    print("✗ Adapter: s3_use_path_style read already patched or not found")

if OLD_ADAPTER_RETURN in adapter_src:
    adapter_src = adapter_src.replace(OLD_ADAPTER_RETURN, NEW_ADAPTER_RETURN)
    print("✓ Adapter: added s3_use_path_style to S3Connector constructor call")
else:
    print("✗ Adapter: constructor call already patched or not found")

# ─── Patch 2: s3_connector.py — add path-style support ───────────────────────
# Add s3_use_path_style parameter to __init__ and handle bucket extraction + path prefix

OLD_CONNECTOR_INIT = """        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
    ):
        # initialize base class, which includes some common attributes
        super().__init__(local_cpu_backend.config, local_cpu_backend.metadata)

        if not s3_endpoint.startswith("s3://"):
            raise ValueError("S3 url must start with 's3://'")

        self.s3_part_size = self.full_chunk_size_bytes

        self.s3_endpoint = s3_endpoint.removeprefix("s3://")"""

NEW_CONNECTOR_INIT = """        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        s3_use_path_style: bool = False,
    ):
        # initialize base class, which includes some common attributes
        super().__init__(local_cpu_backend.config, local_cpu_backend.metadata)

        if not s3_endpoint.startswith("s3://"):
            raise ValueError("S3 url must start with 's3://'")

        self.s3_part_size = self.full_chunk_size_bytes

        raw_endpoint = s3_endpoint.removeprefix("s3://")
        # Path-style patch: split "bucket.host:port" into bucket + host
        # when s3_use_path_style=True, avoids DNS lookup of "bucket.ip:port"
        self.s3_bucket_prefix = ""
        if s3_use_path_style and "." in raw_endpoint:
            # Split on first dot: "ddn-kv-cache-01.192.168.147.129:8111"
            # → bucket="ddn-kv-cache-01", host="192.168.147.129:8111"
            dot_idx = raw_endpoint.index(".")
            self.s3_bucket_prefix = "/" + raw_endpoint[:dot_idx]
            self.s3_endpoint = raw_endpoint[dot_idx + 1:]
            logger.info(
                "S3 path-style mode: bucket=%s host=%s",
                raw_endpoint[:dot_idx], self.s3_endpoint
            )
        else:
            self.s3_endpoint = raw_endpoint"""

if OLD_CONNECTOR_INIT in connector_src:
    connector_src = connector_src.replace(OLD_CONNECTOR_INIT, NEW_CONNECTOR_INIT)
    print("✓ Connector: added s3_use_path_style + bucket/host split in __init__")
else:
    print("✗ Connector: __init__ already patched or not found")

# Patch _format_safe_path to prepend bucket prefix
OLD_FORMAT_PATH = '''    def _format_safe_path(self, key_str: str) -> str:
        """
        Generate a safe HTTP path for the S3 key.
        Flattens the key by replacing slashes with underscores and URL-encodes
        any special characters.
        """
        flat_key_str = key_str.replace("/", "_")
        return "/" + url_quote(flat_key_str)'''

NEW_FORMAT_PATH = '''    def _format_safe_path(self, key_str: str) -> str:
        """
        Generate a safe HTTP path for the S3 key.
        Flattens the key by replacing slashes with underscores and URL-encodes
        any special characters. When path-style is enabled, prepends /bucket/.
        """
        flat_key_str = key_str.replace("/", "_")
        return self.s3_bucket_prefix + "/" + url_quote(flat_key_str)'''

if OLD_FORMAT_PATH in connector_src:
    connector_src = connector_src.replace(OLD_FORMAT_PATH, NEW_FORMAT_PATH)
    print("✓ Connector: patched _format_safe_path to use bucket prefix")
else:
    print("✗ Connector: _format_safe_path already patched or not found")

# Write patches
with open(S3_CONNECTOR, 'w') as f:
    f.write(connector_src)
print("✓ s3_connector.py written")

with open(S3_ADAPTER, 'w') as f:
    f.write(adapter_src)
print("✓ s3_adapter.py written")

print("\n=== Verification ===")
print("s3_use_path_style in connector:", "s3_use_path_style" in connector_src)
print("s3_bucket_prefix in connector:", "s3_bucket_prefix" in connector_src)
print("s3_use_path_style in adapter:", "s3_use_path_style" in adapter_src)
print("\nDone! Now update lmcache_infinia.yaml to add:")
print("  remote_url: \"s3://ddn-kv-cache-01.192.168.147.129:8111\"  (keep as is)")
print("  extra_config:")
print("    s3_use_path_style: true  (NEW)")
print("Then restart vLLM.")
