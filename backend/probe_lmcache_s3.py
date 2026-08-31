#!/usr/bin/env python3
"""Find how LMCache S3 backend handles endpoint URL and credentials."""
import subprocess, os, glob

dynamo_lib = "/home/nwasim/dynamo-env/lib/python3.12/site-packages/lmcache"

# Find S3-related source files
print("=== LMCache S3-related files ===")
for f in glob.glob(f"{dynamo_lib}/**/*.py", recursive=True):
    try:
        with open(f) as fh:
            content = fh.read()
        if 's3' in content.lower() and ('boto' in content.lower() or 'endpoint' in content.lower()):
            print(f"\n--- {f.replace(dynamo_lib, 'lmcache')} ---")
            # Show relevant lines
            for i, line in enumerate(content.split('\n'), 1):
                if any(k in line.lower() for k in ['boto', 's3', 'endpoint_url', 'aws_', 'access_key', 'secret_key', 'remote_url']):
                    print(f"  {i}: {line}")
    except:
        pass

print("\n=== Check for LMCACHE_* env vars in lmcache source ===")
r = subprocess.run(['grep', '-r', 'LMCACHE_', dynamo_lib, '--include=*.py', '-h'],
                   capture_output=True, text=True)
lines = set(r.stdout.strip().split('\n'))
for line in sorted(lines):
    if 'LMCACHE_' in line and len(line.strip()) < 120:
        print(f"  {line.strip()}")

print("\n=== Check AWS env var usage ===")
r2 = subprocess.run(['grep', '-r', 'AWS_', dynamo_lib, '--include=*.py', '-h'],
                    capture_output=True, text=True)
for line in set(r2.stdout.strip().split('\n')):
    if 'AWS_' in line and len(line.strip()) < 120:
        print(f"  {line.strip()}")
