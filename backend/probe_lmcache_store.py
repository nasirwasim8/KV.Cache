#!/usr/bin/env python3
"""Check what LMCache is actually doing with store calls - look at adapter behavior."""
import sys
sys.path.insert(0, '/home/nwasim/dynamo-env/lib/python3.12/site-packages')

# Check if save_unfull_chunk is loaded correctly
from lmcache.v1.config import LMCacheEngineConfig
cfg = LMCacheEngineConfig.from_file('/home/nwasim/lmcache_infinia.yaml')
print(f"save_unfull_chunk : {cfg.save_unfull_chunk}")
print(f"save_decode_cache : {cfg.save_decode_cache}")
print(f"store_location    : {cfg.store_location}")
print(f"retrieve_locations: {cfg.retrieve_locations}")
print(f"chunk_size        : {cfg.chunk_size}")
print(f"local_cpu         : {cfg.local_cpu}")
print(f"max_local_cpu_size: {cfg.max_local_cpu_size}")

# Look at the vllm adapter to understand what triggers a store
import inspect
try:
    from lmcache.integration.vllm.vllm_v1_adapter import LMCacheConnectorV1
    src = inspect.getsource(LMCacheConnectorV1)
    # Find the save/store methods
    lines = src.split('\n')
    in_save = False
    for i, line in enumerate(lines):
        if 'def save' in line or 'def store' in line or 'save_kv' in line or 'finish_prefill' in line or 'send_kv_caches' in line:
            print(f"\nMethod at line {i}: {line.strip()}")
            in_save = True
        if in_save and i < len(lines)-1:
            if lines[i+1].strip().startswith('def ') and i > 0:
                in_save = False
except Exception as e:
    print(f"Error inspecting LMCacheConnectorV1: {e}")

# Check what methods exist on the connector
print("\n=== LMCacheConnectorV1 methods ===")
for name in dir(LMCacheConnectorV1):
    if not name.startswith('__'):
        print(f"  {name}")
