#!/usr/bin/env python3
"""Deep-probe NIXL API and check LMCache/Dynamo install requirements."""
import subprocess, sys, os

# Check nixl_cu13 API
print("=== NIXL API ===")
try:
    import nixl_cu13._api as n
    print("nixl_cu13._api dir:", [x for x in dir(n) if not x.startswith('_')])
except Exception as e:
    print(f"nixl_cu13._api failed: {e}")

try:
    import nixl
    print("nixl module dir:", [x for x in dir(nixl) if not x.startswith('_')])
except Exception as e:
    print(f"nixl failed: {e}")

# Check nixl_cu13 init
try:
    p = os.path.expanduser("~/dynamo-env/lib/python3.12/site-packages/nixl_cu13/__init__.py")
    with open(p) as f:
        print("\nnixl_cu13/__init__.py:")
        print(f.read()[:500])
except Exception as e:
    print(f"Can't read nixl init: {e}")

# Check nixl/_api.py
try:
    p2 = os.path.expanduser("~/dynamo-env/lib/python3.12/site-packages/nixl_cu13/_api.py")
    with open(p2) as f:
        content = f.read()
    print("\nnixl_cu13/_api.py first 60 lines:")
    for i, line in enumerate(content.split('\n')[:60], 1):
        print(f"  {i}: {line}")
except Exception as e:
    print(f"Can't read nixl _api.py: {e}")

# Check pip packages for lmcache
print("\n=== LMCache pip search ===")
r = subprocess.run(["pip", "index", "versions", "lmcache"], capture_output=True, text=True)
print(r.stdout[:300] or r.stderr[:300])

# Check vLLM KV transfer capability
print("\n=== vLLM KV Transfer ===")
try:
    from vllm.config import KVTransferConfig
    print("vLLM KVTransferConfig: available")
except Exception as e:
    print(f"vLLM KVTransferConfig: {e}")

# Check if dynamo is installed as a CLI
print("\n=== Dynamo CLI ===")
r2 = subprocess.run(["which", "dynamo"], capture_output=True, text=True)
print("dynamo CLI:", r2.stdout.strip() or "not found")
r3 = subprocess.run(["dynamo", "--help"], capture_output=True, text=True)
print("dynamo --help:", r3.stdout[:200] or r3.stderr[:200])
