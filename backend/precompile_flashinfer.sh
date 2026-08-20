#!/bin/bash
# DDN — Pre-compile FlashInfer JIT kernels for vLLM
# Run this ONCE from a WSL terminal. Takes ~5-10 minutes.
# After this, vLLM starts without needing nvcc.

CUDA_HOME=/home/nwasim/dynamo-env/lib/python3.12/site-packages/nvidia/cu13
export CUDA_HOME
export PATH=${CUDA_HOME}/bin:${PATH}
export VIRTUAL_ENV=/home/nwasim/dynamo-env

source /home/nwasim/dynamo-env/bin/activate

echo "=== Pre-compiling FlashInfer JIT kernels ==="
echo "This takes 5-10 minutes on first run..."

python3 - << 'PYEOF'
import os
os.environ["CUDA_HOME"] = "/home/nwasim/dynamo-env/lib/python3.12/site-packages/nvidia/cu13"
os.environ["PATH"] = os.environ["CUDA_HOME"] + "/bin:" + os.environ.get("PATH", "")

print("Importing flashinfer...")
import flashinfer
print("FlashInfer version:", flashinfer.__version__)

print("\nPre-compiling sampling kernels...")
try:
    from flashinfer.sampling import get_sampling_module
    mod = get_sampling_module()
    print("✅ Sampling module compiled OK")
except Exception as e:
    print(f"Sampling: {e}")

print("\nPre-compiling cascade attention kernels...")
try:
    from flashinfer.cascade import get_batch_decode_module
    print("✅ Cascade module available")
except Exception as e:
    print(f"Cascade: {e}")

print("\nDone! FlashInfer kernels cached at ~/.cache/flashinfer/")
PYEOF
