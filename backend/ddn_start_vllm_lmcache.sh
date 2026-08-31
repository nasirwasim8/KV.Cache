#!/bin/bash
# vLLM startup script — with DDN Infinia KV cache via LMCache
# Loaded by PM2 process: ddn-vllm
#
# Architecture:
#   vLLM (GPU HBM prefix cache, hot tier)
#     ↕ LMCacheConnectorV1
#   DDN Infinia (S3, cold/persistent tier)
#
# When GPU HBM fills up, LMCache evicts KV blocks to Infinia S3.
# On cache miss in HBM, LMCache fetches blocks from Infinia (skips recompute).

source /home/nwasim/dynamo-env/bin/activate

# Set CUDA_HOME so FlashInfer JIT compilation can find nvcc
export CUDA_HOME=/home/nwasim/dynamo-env/lib/python3.12/site-packages/nvidia/cu13
export PATH=/home/nwasim/dynamo-env/lib/python3.12/site-packages/nvidia/cu13/bin:$PATH

# Use fork instead of spawn for multiprocessing — avoids CUDA context re-init
export VLLM_WORKER_MULTIPROC_METHOD=fork
# Disable FlashInfer sampler JIT — CUDA 13 header mismatch on RTX 5090 in WSL2
export VLLM_USE_FLASHINFER_SAMPLER=0
# Ensure consistent KV block hashing across vLLM + LMCache processes
export PYTHONHASHSEED=0

# ── LMCache + Infinia configuration ──────────────────────────────────────────
# Tell LMCache where to find its config file
export LMCACHE_CONFIG_FILE=/home/nwasim/lmcache_infinia.yaml

# AWS env vars for awscrt S3 client (used by LMCache S3 connector)
# Note: credentials are also in the YAML extra_config for redundancy
export AWS_ACCESS_KEY_ID=DJ1S7LSGEIT9AKYCWVL5
export AWS_SECRET_ACCESS_KEY=wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu
export AWS_DEFAULT_REGION=us-east-1
# Suppress LMCache usage telemetry banner
export LMCACHE_DISABLE_BANNER=1

exec python3 -m vllm.entrypoints.openai.api_server \
  --model /home/nwasim/models/Llama-3.1-8B-Instruct \
  --served-model-name meta-llama/Llama-3.1-8B-Instruct \
  --enable-prefix-caching \
  --enforce-eager \
  --port 11000 \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.92 \
  --kv-transfer-config '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_both","kv_load_failure_policy":"recompute"}'
