#!/usr/bin/env bash
# DDN vLLM Launch Script
# CUDA_HOME → nvidia Python package (CUDA 13.0)
# VLLM_USE_FLASHINFER_SAMPLER=0 → use native vLLM sampler, skip FlashInfer JIT compile
#   (FlashInfer JIT fails after reboot when CUDA 13 headers are mismatched)

DYNAMO_BIN="/home/nwasim/dynamo-env/bin"
CUDA_HOME="/home/nwasim/dynamo-env/lib/python3.12/site-packages/nvidia/cu13"

export CUDA_HOME="$CUDA_HOME"
export PATH="$DYNAMO_BIN:$CUDA_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export VIRTUAL_ENV="$DYNAMO_BIN/.."
export VLLM_WORKER_MULTIPROC_METHOD=fork

# Disable FlashInfer sampler JIT compilation — avoids CUDA header conflict on reboot
export VLLM_USE_FLASHINFER_SAMPLER=0

# LMCache configuration for DDN Infinia
export LMCACHE_CONFIG_FILE="/home/nwasim/lmcache_infinia.yaml"

exec "$DYNAMO_BIN/python3" -m vllm.entrypoints.openai.api_server \
  --model /home/nwasim/models/Llama-3.1-8B-Instruct \
  --served-model-name meta-llama/Llama-3.1-8B-Instruct \
  --enable-prefix-caching \
  --enforce-eager \
  --port 11000 \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.92 \
  --kv-transfer-config '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_both"}'
