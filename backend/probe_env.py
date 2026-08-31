#!/usr/bin/env python3
"""Test NIXL, check LMCache availability, check FlashInfer."""
import sys, subprocess

# Test 1: NIXL
try:
    import nixl
    from nixl._api import nixlAgent
    print("NIXL import: OK")
    try:
        agent = nixlAgent("probe", {})
        print("NIXL agent instantiation: OK")
    except Exception as e:
        print(f"NIXL agent instantiation: FAILED — {e}")
except Exception as e:
    print(f"NIXL import: FAILED — {e}")

# Test 2: FlashInfer
try:
    import flashinfer
    print(f"FlashInfer import: OK — version {flashinfer.__version__}")
except Exception as e:
    print(f"FlashInfer import: FAILED — {e}")

# Test 3: vLLM
try:
    import vllm
    print(f"vLLM import: OK — version {vllm.__version__}")
except Exception as e:
    print(f"vLLM import: FAILED — {e}")

# Test 4: LMCache
try:
    import lmcache
    print(f"LMCache import: OK — version {lmcache.__version__}")
except Exception as e:
    print(f"LMCache import: FAILED — {e}")

# Test 5: Dynamo
try:
    import dynamo
    print(f"Dynamo import: OK — {dynamo.__version__}")
except Exception as e:
    print(f"Dynamo import: FAILED — {e}")

# Test 6: CUDA direct
try:
    import torch
    print(f"PyTorch CUDA: {torch.cuda.is_available()} — device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")
    print(f"CUDA version: {torch.version.cuda}")
except Exception as e:
    print(f"PyTorch: FAILED — {e}")

# Test 7: WSL2 check
try:
    with open("/proc/version") as f:
        v = f.read()
    print(f"Kernel: {'WSL2' if 'microsoft' in v.lower() else 'Bare-metal'}")
except:
    pass

print("\nNIXL package files:")
try:
    import nixl, os
    pkg_dir = os.path.dirname(nixl.__file__)
    for fn in os.listdir(pkg_dir):
        print(f"  {fn}")
except Exception as e:
    print(f"  {e}")
