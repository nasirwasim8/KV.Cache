#!/usr/bin/env python3
"""Validate LMCache YAML config loads correctly and S3 connector initializes."""
import os
os.environ['LMCACHE_CONFIG_FILE'] = '/home/nwasim/lmcache_infinia.yaml'

print("=== LMCache Config Validation ===")
try:
    from lmcache.v1.config import LMCacheEngineConfig
    cfg = LMCacheEngineConfig.from_file('/home/nwasim/lmcache_infinia.yaml')
    print(f"✓ Config loaded from YAML")
    print(f"  chunk_size     : {cfg.chunk_size}")
    print(f"  local_cpu      : {cfg.local_cpu}")
    print(f"  remote_url     : {cfg.remote_url}")
    print(f"  remote_serde   : {cfg.remote_serde}")
    print(f"  save_decode    : {cfg.save_decode_cache}")
    print(f"  extra_config   : {cfg.extra_config}")
except Exception as e:
    import traceback
    print(f"✗ Config load failed: {e}")
    traceback.print_exc()

print("\n=== S3 URL Format Validation ===")
url = "s3://ddn-kv-cache-01.192.168.147.129:8111"
try:
    from lmcache.v1.storage_backend.connector import parse_remote_url
    parsed = parse_remote_url(url)
    print(f"✓ URL parsed: {parsed}")
except Exception as e:
    print(f"  parse_remote_url not available: {e}")

# Test that the S3 adapter can parse the URL
try:
    from lmcache.v1.storage_backend.connector.s3_adapter import S3ConnectorAdapter
    adapter = S3ConnectorAdapter()
    can = adapter.can_parse(url)
    print(f"✓ S3ConnectorAdapter.can_parse('{url}'): {can}")
except Exception as e:
    print(f"✗ S3ConnectorAdapter: {e}")

print("\n=== verify_peer=False patch check ===")
try:
    import inspect
    from lmcache.v1.storage_backend.connector import s3_connector
    src = inspect.getsource(s3_connector)
    if 'verify_peer = False' in src:
        print("✓ S3Connector patched with verify_peer=False")
    else:
        print("✗ Patch NOT applied — verify_peer=False not found in source")
except Exception as e:
    print(f"Patch check error: {e}")
