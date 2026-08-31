#!/usr/bin/env python3
"""
High-load burst test: send many requests with a long shared prefix to fill
GPU HBM and trigger LMCache eviction to Infinia S3.

LMCache writes KV tensors to Infinia when GPU HBM KV cache blocks are evicted.
On RTX 5090 (22GB KV cache), we need to accumulate enough prefix history.
"""
import requests, json, time, boto3, urllib3, threading, concurrent.futures
urllib3.disable_warnings()

VLLM_URL    = "http://localhost:11000/v1/chat/completions"
MODEL       = "meta-llama/Llama-3.1-8B-Instruct"
S3_ENDPOINT = "https://192.168.147.129:8111"
ACCESS_KEY  = "DJ1S7LSGEIT9AKYCWVL5"
SECRET_KEY  = "wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu"
BUCKET      = "ddn-kv-cache-01"

# Very long system prompt to build large KV blocks (more tokens = more HBM used)
# ~600 tokens to maximize prefix KV usage per request
LONG_SYSTEM = """You are an AI infrastructure expert. Your knowledge spans:
GPU Architecture: NVIDIA H100, A100, RTX 5090, HBM3 memory with 3.35TB/s bandwidth, CUDA cores,
Tensor Cores, SM partitioning, warp scheduling, memory coalescing, L1/L2 cache hierarchy, and 
PCIe/NVLink interconnects for multi-GPU setups. You understand KV cache management in LLM inference.

LLM Inference Systems: vLLM, TensorRT-LLM, FasterTransformer, Triton Inference Server.
Attention mechanisms, KV caching, prefix sharing, PagedAttention, FlashAttention v2/v3,
chunked prefill, speculative decoding, tensor/pipeline/sequence parallelism.

Storage Systems: DDN Infinia object storage, S3-compatible APIs, NVLINK fabric, GPUDirect Storage,
NVMe-oF, InfiniBand, RDMA, cuFile, GDS (GPU Direct Storage), persistent KV cache offload,
LMCache, disaggregated prefill/decode (PD disaggregation), LMCache S3 connector.

Kubernetes & Cloud: GPU operator, MIG (Multi-Instance GPU), DCGM, Prometheus metrics, 
NCCL collective operations, Ray, Slurm HPC job scheduling, container runtimes.

Benchmarking: TTFT (Time to First Token), TBT (Time Between Tokens), p50/p99 latency,
tokens per second throughput, inter-token latency, request concurrency, queue depth analysis.
You can analyze performance profiles and identify bottlenecks in GPU/CPU/storage/network paths."""

s3 = boto3.client('s3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    verify=False,
)

questions = [
    "Explain the PagedAttention memory management algorithm and how it reduces GPU memory fragmentation.",
    "What is the difference between prefill and decode phases in LLM inference? Why does TTFT matter?",
    "How does NVIDIA NVLink reduce inter-GPU communication latency compared to PCIe Gen5?",
    "Describe how LMCache stores KV tensors in DDN Infinia S3 and retrieves them on cache miss.",
    "What is KV cache eviction policy in vLLM and when does it write to remote storage?",
    "Explain chunked prefill and its impact on GPU memory utilization and request throughput.",
    "How does speculative decoding improve token generation throughput on A100/H100?",
    "What is the relationship between KV cache size, sequence length, and batch size in vLLM?",
    "Describe disaggregated prefill/decode (PD disaggregation) in large-scale LLM serving.",
    "How does FlashAttention v3 reduce HBM memory bandwidth requirements vs naive attention?",
    "What metrics should I monitor to identify GPU memory bottlenecks during LLM inference?",
    "Explain how DDN Infinia's S3-compatible API enables persistent KV cache across restarts.",
    "What are the trade-offs between tensor parallelism and pipeline parallelism for LLM serving?",
    "How does prefix caching reduce TTFT for chatbot applications with repeated system prompts?",
    "Describe the role of NCCL in multi-GPU LLM inference and common collective operations.",
    "What is the impact of bfloat16 vs float16 precision on LLM inference accuracy and speed?",
    "Explain how vLLM's continuous batching differs from static batching for throughput optimization.",
    "How do GDS (GPU Direct Storage) and RDMA reduce latency for KV cache retrieval from storage?",
    "What is the significance of p99 TTFT vs p50 TTFT in LLM serving SLA definitions?",
    "Describe how LMCache computes chunk hashes for deduplication and retrieval of KV blocks.",
]

def send_query(q_idx, question):
    try:
        t0 = time.time()
        r = requests.post(VLLM_URL, json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": LONG_SYSTEM},
                {"role": "user",   "content": question},
            ],
            "max_tokens": 150,
            "temperature": 0.1,
        }, timeout=180)
        elapsed = time.time() - t0
        if r.status_code == 200:
            return q_idx, elapsed, "OK"
        else:
            return q_idx, elapsed, f"ERR {r.status_code}"
    except Exception as e:
        return q_idx, 0, f"EXCEPTION: {e}"

def count_infinia():
    try:
        r = s3.list_objects_v2(Bucket=BUCKET, MaxKeys=1000)
        keys = [o['Key'] for o in r.get('Contents', [])]
        lmcache_keys = [k for k in keys if 'lmcache' in k.lower() or not k.startswith('kvcache/')]
        return len(keys), lmcache_keys[:5]
    except Exception as e:
        return -1, [str(e)]

print("=" * 60)
print("LMCache Eviction Load Test — Filling GPU HBM → Infinia")
print("=" * 60)
print(f"Sending {len(questions)} requests with long system prompt (~600 tokens)")
print("Concurrency: 3 parallel requests\n")

before_total, before_lm = count_infinia()
print(f"Infinia objects before: {before_total}")

results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(send_query, i, q): i for i, q in enumerate(questions)}
    for future in concurrent.futures.as_completed(futures):
        idx, elapsed, status = future.result()
        results.append((idx, elapsed, status))
        after, _ = count_infinia()
        print(f"  Query {idx+1:2d}: {elapsed:.1f}s — {status} | Infinia objects: {after}")

after_total, after_lm = count_infinia()

print(f"\n{'='*60}")
print(f"RESULTS:")
print(f"  Queries sent     : {len(questions)}")
print(f"  Infinia BEFORE   : {before_total} objects")
print(f"  Infinia AFTER    : {after_total} objects")
print(f"  New KV objects   : {after_total - before_total}")
if after_total > before_total:
    print(f"\n  ✅ LMCache successfully wrote KV tensors to DDN Infinia!")
    print(f"  New LMCache keys : {after_lm}")
else:
    print(f"\n  ℹ️  No eviction yet. HBM ({22}GB) not full.")
    print(f"  Running AIperf benchmark will trigger more eviction.")
    timings = [r[1] for r in results if r[1] > 0]
    if timings:
        print(f"  Avg query time: {sum(timings)/len(timings):.2f}s")
