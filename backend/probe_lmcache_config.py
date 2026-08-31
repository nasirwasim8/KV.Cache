#!/usr/bin/env python3
"""Read LMCacheEngineConfig fields and understand how it's built from vLLM extra_config."""
import inspect, sys

# 1. LMCacheEngineConfig fields
try:
    from lmcache.v1.config import LMCacheEngineConfig
    src = inspect.getsource(LMCacheEngineConfig)
    print("=== LMCacheEngineConfig ===")
    print(src[:4000])
except Exception as e:
    print(f"LMCacheEngineConfig: {e}")

# 2. How vLLM builds it from extra_config
try:
    with open("/home/nwasim/dynamo-env/lib/python3.12/site-packages/vllm/distributed/kv_transfer/kv_connector/v1/lmcache_integration/vllm_v1_adapter.py") as f:
        content = f.read()
    # Find the init/build_from section
    start = content.find("def _init_lmcache")
    if start < 0:
        start = content.find("LMCacheEngineConfig(")
    print("\n=== LMCache engine init from vLLM ===")
    print(content[start:start+2000])
except Exception as e:
    print(f"Adapter read: {e}")

# 3. Try creating a config pointing to Infinia
try:
    from lmcache.v1.config import LMCacheEngineConfig
    cfg = LMCacheEngineConfig(
        chunk_size=256,
        local_cpu=False,
        max_local_cpu_size=0,
        remote_url="s3://ddn-kv-cache-01",
        remote_access_key="DJ1S7LSGEIT9AKYCWVL5",
        remote_secret_key="wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu",
        remote_endpoint="https://192.168.147.129:8111",
        remote_serde="safetensors",
    )
    print("\n=== Config created successfully ===")
    print(cfg)
except TypeError as e:
    print(f"\nConfig TypeError (likely field name mismatch): {e}")
    # Try to figure out what fields exist
    try:
        import dataclasses
        fields = dataclasses.fields(LMCacheEngineConfig)
        print("Available fields:")
        for f in fields:
            print(f"  {f.name}: {f.type} = {f.default!r}")
    except Exception as e2:
        print(f"Can't get fields: {e2}")
except Exception as e:
    print(f"Config creation failed: {e}")
