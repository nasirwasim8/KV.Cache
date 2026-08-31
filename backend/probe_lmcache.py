#!/usr/bin/env python3
"""Check vLLM KVTransfer config fields and available connectors."""
import subprocess, sys, os

print("=== vLLM KV Transfer Config ===")
try:
    from vllm.config import KVTransferConfig
    import inspect
    src = inspect.getsource(KVTransferConfig)
    print(src[:2000])
except Exception as e:
    print(f"KVTransferConfig: {e}")

print("\n=== Search for LMCache connector in vLLM ===")
try:
    import vllm
    vllm_path = os.path.dirname(vllm.__file__)
    r = subprocess.run(
        ["grep", "-r", "LMCache", vllm_path, "--include=*.py", "-l"],
        capture_output=True, text=True
    )
    print("Files mentioning LMCache:")
    print(r.stdout or "  (none)")
    
    r2 = subprocess.run(
        ["grep", "-r", "kv_connector", vllm_path, "--include=*.py", "-l"],
        capture_output=True, text=True
    )
    print("Files with kv_connector:")
    print(r2.stdout[:500] or "  (none)")
except Exception as e:
    print(f"vLLM search failed: {e}")

print("\n=== LMCache pip install simulation ===")
r3 = subprocess.run(
    ["pip", "install", "--dry-run", "lmcache==0.5.4"],
    capture_output=True, text=True
)
print(r3.stdout[:500] or r3.stderr[:500])

print("\n=== Check S3/boto3 availability ===")
try:
    import boto3
    print("boto3: available")
    s3 = boto3.client(
        's3',
        endpoint_url='http://192.168.147.129:8111',
        aws_access_key_id='minioadmin',
        aws_secret_access_key='minioadmin',
    )
    resp = s3.list_buckets()
    print(f"Infinia buckets: {[b['Name'] for b in resp.get('Buckets', [])]}")
except Exception as e:
    print(f"boto3/Infinia: {e}")
