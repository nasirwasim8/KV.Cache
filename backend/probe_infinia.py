#!/usr/bin/env python3
"""Test Infinia S3 connectivity with correct HTTPS endpoint and real credentials."""
import boto3, urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ENDPOINT  = "https://192.168.147.129:8111"
ACCESS_KEY = "0099L39GNX7TBC76NTVV"
SECRET_KEY = "OXSzBP1TH5Pz0Hon2Ovn43b0gMZbKeoosZfFPO45"
BUCKET     = "ddn-kv-cache-01"

print(f"Testing Infinia at {ENDPOINT} ...")
print(f"Bucket: {BUCKET}\n")

try:
    s3 = boto3.client(
        's3',
        endpoint_url=ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name='us-east-1',
        verify=False,   # self-signed cert
    )

    # 1. List all buckets
    resp = s3.list_buckets()
    buckets = [b['Name'] for b in resp.get('Buckets', [])]
    print(f"✓ list_buckets: {buckets}")

    # 2. List objects in our bucket
    resp2 = s3.list_objects_v2(Bucket=BUCKET, MaxKeys=10)
    objs = [(o['Key'], o['Size']) for o in resp2.get('Contents', [])]
    print(f"✓ list_objects in {BUCKET}: {len(objs)} objects")
    for key, size in objs[:5]:
        print(f"    {key}  ({size:,} bytes)")
    if not objs:
        print("    (bucket is empty)")

    # 3. Test a PUT
    import json, time
    test_key = f"lmcache-probe/test-{int(time.time())}.json"
    payload  = json.dumps({"probe": True, "ts": time.time()}).encode()
    s3.put_object(Bucket=BUCKET, Key=test_key, Body=payload)
    print(f"✓ PUT  s3://{BUCKET}/{test_key}")

    # 4. Test a GET
    r = s3.get_object(Bucket=BUCKET, Key=test_key)
    body = r['Body'].read()
    print(f"✓ GET  s3://{BUCKET}/{test_key} → {body.decode()}")

    # 5. Clean up
    s3.delete_object(Bucket=BUCKET, Key=test_key)
    print(f"✓ DELETE {test_key}")

    print("\n✅ Infinia S3 connectivity: FULLY WORKING")

except Exception as e:
    print(f"\n❌ Failed: {type(e).__name__}: {e}")
    import traceback; traceback.print_exc()

# Also test redcli location on this machine
import subprocess, os
print("\n--- Looking for redcli / infinia CLI on this machine ---")
for path in ['/usr/local/bin', '/usr/bin', '/opt/ddn/bin', '/opt/infinia/bin', os.path.expanduser('~/bin'), '/usr/sbin']:
    p = os.path.join(path, 'redcli')
    if os.path.exists(p):
        print(f"  FOUND: {p}")

r = subprocess.run(['find', '/usr', '/opt', '/home/nwasim', '-name', 'redcli', '-type', 'f'],
                   capture_output=True, text=True, timeout=5)
if r.stdout.strip():
    print(f"  find result: {r.stdout.strip()}")
else:
    print("  redcli not found on this machine (WSL2) — expected, it lives on the Infinia hardware at 192.168.147.129")
