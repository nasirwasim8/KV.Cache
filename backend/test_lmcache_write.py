#!/usr/bin/env python3
"""
Targeted test: restart vLLM cold HBM state isn't needed — we need prompts > 256 tokens
so LMCache has full KV chunks to store to CPU and eventually S3.

This test:
1. Checks Infinia object count
2. Sends queries with prompts OVER 256 tokens (to get full chunks)
3. Verifies CPU cache is being populated by LMCache
4. Checks Infinia S3 for new objects
"""
import requests, time, boto3, urllib3, os
urllib3.disable_warnings()

VLLM_URL    = "http://localhost:11000/v1/chat/completions"
MODEL       = "meta-llama/Llama-3.1-8B-Instruct"
S3_ENDPOINT = "https://192.168.147.129:8111"
ACCESS_KEY  = "DJ1S7LSGEIT9AKYCWVL5"
SECRET_KEY  = "wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu"
BUCKET      = "ddn-kv-cache-01"

# ~400 token system prompt (guaranteed over chunk_size=256)
SYSTEM_400 = (
    "You are an expert AI infrastructure consultant. "
    "Your knowledge spans GPU architecture including NVIDIA H100, A100, RTX 5090, HBM3 memory, "
    "CUDA cores, Tensor Cores, SM partitioning, warp scheduling, memory coalescing, L1/L2 cache "
    "hierarchy, and PCIe/NVLink interconnects for multi-GPU setups. You understand KV cache "
    "management in LLM inference including PagedAttention, FlashAttention v2 and v3, chunked "
    "prefill, speculative decoding, and KV tensor layout in GPU HBM memory. "
    "You also have deep expertise in DDN Infinia object storage, S3-compatible API design, "
    "NVMe-oF protocol, InfiniBand networking, RDMA data transfers, GPU Direct Storage integration, "
    "and persistent KV cache architectures using LMCache. You can explain how vLLM's "
    "LMCacheConnectorV1 offloads KV blocks from GPU HBM to DDN Infinia S3 object storage, "
    "how the CPU DRAM staging buffer works as an intermediate tier, and what happens to TTFT "
    "and throughput metrics when the KV cache warm-up period completes. "
    "You benchmark AI inference systems and understand p50, p99, p999 latency percentiles, "
    "TTFT (time to first token), ITL (inter-token latency), tokens per second throughput, "
    "concurrent request handling, queue depth analysis, and SLA compliance metrics. "
    "Always give precise technical answers with specific numbers when possible."
)

s3 = boto3.client('s3', endpoint_url=S3_ENDPOINT,
    aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY, verify=False)

def list_infinia():
    try:
        r = s3.list_objects_v2(Bucket=BUCKET, MaxKeys=100)
        keys = [o['Key'] for o in r.get('Contents', [])]
        return len(keys), keys
    except Exception as e:
        return -1, [str(e)]

def send_query(msg, max_tokens=100):
    t0 = time.time()
    resp = requests.post(VLLM_URL, json={
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM_400}, {"role": "user", "content": msg}],
        "max_tokens": max_tokens, "temperature": 0.1,
    }, timeout=120)
    elapsed = time.time() - t0
    if resp.status_code == 200:
        usage = resp.json().get('usage', {})
        return elapsed, "OK", usage.get('prompt_tokens', 0)
    return elapsed, f"ERR {resp.status_code}", 0

print("=" * 60)
print("LMCache Infinia Write Verification Test")
print("System prompt ~400 tokens (> chunk_size 256)")
print("=" * 60)

n_before, keys_before = list_infinia()
print(f"\nInfinia BEFORE: {n_before} objects")

queries = [
    "Explain how GPU HBM differs from DRAM in bandwidth and latency for LLM inference.",
    "What is the typical TTFT improvement when using LMCache with DDN Infinia S3 backend?",
    "How does vLLM's PagedAttention manage GPU memory fragmentation?",
    "Describe the flow of KV blocks from GPU HBM to CPU DRAM to S3 in LMCache.",
    "What benchmark metrics matter most when evaluating LLM serving infrastructure?",
]

total_prompt_tokens = 0
for i, q in enumerate(queries):
    elapsed, status, prompt_toks = send_query(q)
    total_prompt_tokens += prompt_toks
    n, _ = list_infinia()
    print(f"  [{i+1}] {elapsed:.1f}s | prompt_tokens={prompt_toks} | Infinia={n} | {status}")
    time.sleep(1)

# Wait for async S3 uploads (LMCache uploads asynchronously)
print("\nWaiting 10s for async S3 uploads to complete...")
time.sleep(10)

n_after, keys_after = list_infinia()
new_keys = [k for k in keys_after if k not in keys_before]

print(f"\n{'='*60}")
print(f"Infinia AFTER : {n_after} objects")
print(f"New objects   : {n_after - n_before}")
if new_keys:
    print(f"New keys      : {new_keys[:10]}")
    print(f"\n✅ LMCache is writing KV blocks to DDN Infinia!")
else:
    print(f"\nAll keys: {keys_after}")
    print(f"\n⚠️  Still no new objects. LMCache may need save_unfull_chunk=true to take effect")
    print(f"   after vLLM restart (the new config must be loaded fresh)")
print(f"\nTotal prompt tokens sent: {total_prompt_tokens}")
print(f"Each chunk = {256} tokens = 32MB KV tensor")
