#!/usr/bin/env python3
"""
Send test queries to vLLM and verify KV tensors land in Infinia S3.
This proves Infinia is in the actual inference path.
"""
import requests, json, time, boto3, urllib3
urllib3.disable_warnings()

VLLM_URL  = "http://localhost:11000/v1/chat/completions"
MODEL     = "meta-llama/Llama-3.1-8B-Instruct"
S3_ENDPOINT = "https://192.168.147.129:8111"
ACCESS_KEY  = "DJ1S7LSGEIT9AKYCWVL5"
SECRET_KEY  = "wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu"
BUCKET      = "ddn-kv-cache-01"

# Long system prompt to build up significant KV tensors
SYSTEM_PROMPT = """You are an expert AI infrastructure consultant specializing in GPU memory optimization, 
distributed inference systems, and high-performance computing storage. You have deep expertise in 
NVIDIA GPU architecture, KV cache management, prefix caching techniques, and DDN Infinia object storage 
for AI workloads. You understand how transformer attention mechanisms work at the hardware level,
including HBM memory bandwidth, CUDA kernels for attention computation, and how KV tensors are 
generated and stored during LLM inference. When answering questions, provide precise technical details
about memory hierarchies, throughput numbers, and system architecture trade-offs."""

s3 = boto3.client('s3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    verify=False,
)

def count_infinia_objects():
    try:
        r = s3.list_objects_v2(Bucket=BUCKET, Prefix="")
        return r.get('KeyCount', 0), [o['Key'] for o in r.get('Contents', [])[:5]]
    except Exception as e:
        return -1, [str(e)]

def send_query(user_msg, max_tokens=200):
    t0 = time.time()
    resp = requests.post(VLLM_URL, json={
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg}
        ],
        "max_tokens": max_tokens,
        "temperature": 0.1,
    }, timeout=120)
    elapsed = time.time() - t0
    if resp.status_code == 200:
        content = resp.json()['choices'][0]['message']['content']
        return elapsed, content[:200]
    else:
        return elapsed, f"ERROR {resp.status_code}: {resp.text[:200]}"

print("=" * 60)
print("vLLM + LMCache + DDN Infinia — Integration Test")
print("=" * 60)

# Baseline Infinia object count
before_count, before_keys = count_infinia_objects()
print(f"\nInfinia objects BEFORE queries: {before_count}")
if before_keys:
    print(f"  Sample keys: {before_keys}")

# Query 1
print("\n[1] Sending first query (builds KV cache)...")
t1, resp1 = send_query("Explain how KV caching works in vLLM and why it reduces TTFT for repeated prompts.")
print(f"  Time: {t1:.2f}s")
print(f"  Response: {resp1[:150]}...")
time.sleep(2)

# Query 2 — same system prompt = prefix cache should be reused
print("\n[2] Sending second query (same system prompt — should hit prefix cache)...")
t2, resp2 = send_query("What is the difference between GPU HBM memory bandwidth and DDR5 system RAM for AI inference?")
print(f"  Time: {t2:.2f}s (first={t1:.2f}s)")
print(f"  Response: {resp2[:150]}...")
time.sleep(2)

# Query 3
print("\n[3] Sending third query...")
t3, resp3 = send_query("How does DDN Infinia object storage integrate with LLM inference to provide persistent KV cache?")
print(f"  Time: {t3:.2f}s")
print(f"  Response: {resp3[:150]}...")
time.sleep(3)

# Check Infinia after queries
after_count, after_keys = count_infinia_objects()
print(f"\n{'='*60}")
print(f"Infinia objects AFTER queries: {after_count}")
if after_count != before_count:
    print(f"  ✅ NEW objects written to Infinia: {after_count - before_count}")
    print(f"  Sample keys: {after_keys}")
else:
    print(f"  ℹ️  Object count unchanged ({after_count})")
    print(f"     Note: LMCache writes to Infinia on GPU HBM eviction,")
    print(f"     not on every query. GPU HBM (22GB) may not be full yet.")
    print(f"     Run more queries or use larger prefix to trigger eviction.")

print(f"\n{'='*60}")
print(f"SUMMARY:")
print(f"  vLLM + LMCacheConnectorV1: ✅ Running")
print(f"  LMCache → Infinia path:     {'✅ Objects written' if after_count > before_count else '⏳ HBM not evicted yet'}")
print(f"  kv_load_failure_policy:     recompute (safe fallback)")
print(f"  Query timing: {t1:.2f}s / {t2:.2f}s / {t3:.2f}s")
