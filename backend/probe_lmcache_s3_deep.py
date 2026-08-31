#!/usr/bin/env python3
"""Deep probe: how does LMCache actually use the S3 remote_url and connect?"""
import os, glob

dynamo_lib = "/home/nwasim/dynamo-env/lib/python3.12/site-packages/lmcache"

# Find the actual S3 storage backend  
print("=== LMCache storage backends ===")
for f in sorted(glob.glob(f"{dynamo_lib}/**/*.py", recursive=True)):
    fname = f.replace(dynamo_lib+'/', '')
    if any(k in fname.lower() for k in ['s3', 'remote', 'storage', 'backend']):
        try:
            with open(f) as fh:
                content = fh.read()
            if len(content) > 100:
                print(f"\n  FILE: {fname}")
                for i, line in enumerate(content.split('\n'), 1):
                    if any(k in line.lower() for k in ['s3://', 'endpoint', 'boto', 'aws_', 'access_key', 'secret', 'verify', 'ssl', 'http']):
                        print(f"    {i}: {line[:120]}")
        except: pass

# Also try: from lmcache.v1.config import LMCacheEngineConfig and see from_yaml
print("\n=== LMCacheEngineConfig.from_file / from_yaml ===")
try:
    from lmcache.v1.config import LMCacheEngineConfig
    import inspect
    for name in ['from_yaml', 'from_file', 'from_env', 'from_dict']:
        if hasattr(LMCacheEngineConfig, name):
            print(f"\n  {name}:")
            print(inspect.getsource(getattr(LMCacheEngineConfig, name))[:800])
except Exception as e:
    print(f"Error: {e}")

# Check if there's YAML loading in config
print("\n=== YAML loading ===")
r = os.popen(f"grep -rn 'yaml.load\\|yaml.safe_load\\|from_yaml\\|load_yaml\\|s3.*endpoint\\|endpoint.*s3' {dynamo_lib} --include='*.py' -l 2>/dev/null")
print(r.read()[:1000])
