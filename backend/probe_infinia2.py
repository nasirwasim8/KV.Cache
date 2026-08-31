#!/usr/bin/env python3
"""Test Infinia with credentials from the working RAG app."""
import boto3, urllib3, json, time
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Credentials from the working RAG storage_config.json
ENDPOINT   = "https://192.168.147.129:8111"
ACCESS_KEY = "DJ1S7LSGEIT9AKYCWVL5"
SECRET_KEY = "wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu"
BUCKET     = "ddn-kv-cache-01"

print(f"Testing Infinia at {ENDPOINT}")
print(f"Access key: {ACCESS_KEY}\n")

try:
    s3 = boto3.client(
        's3',
        endpoint_url=ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name='us-east-1',
        verify=False,
    )

    # 1. List buckets
    resp = s3.list_buckets()
    buckets = [b['Name'] for b in resp.get('Buckets', [])]
    print(f"✓ list_buckets: {buckets}")

    # 2. Check our bucket exists or create it
    if BUCKET not in buckets:
        s3.create_bucket(Bucket=BUCKET)
        print(f"✓ Created bucket: {BUCKET}")
    else:
        print(f"✓ Bucket exists: {BUCKET}")

    # 3. List objects
    resp2 = s3.list_objects_v2(Bucket=BUCKET, MaxKeys=10)
    objs = [(o['Key'], o['Size']) for o in resp2.get('Contents', [])]
    print(f"✓ Objects in {BUCKET}: {len(objs)}")
    for key, size in objs[:5]:
        print(f"    {key}  ({size:,} bytes)")

    # 4. PUT test
    test_key = f"lmcache-probe/connectivity-test-{int(time.time())}.json"
    payload = json.dumps({"probe": "lmcache_infinia_test", "ts": time.time()}).encode()
    s3.put_object(Bucket=BUCKET, Key=test_key, Body=payload, ContentType='application/json')
    print(f"✓ PUT  s3://{BUCKET}/{test_key}")

    # 5. GET test
    r = s3.get_object(Bucket=BUCKET, Key=test_key)
    body = r['Body'].read()
    print(f"✓ GET  s3://{BUCKET}/{test_key} → {body.decode()[:80]}")

    # 6. DELETE
    s3.delete_object(Bucket=BUCKET, Key=test_key)
    print(f"✓ DELETE {test_key}")

    print("\n✅ Infinia S3 fully working. Credentials confirmed.")
    print(f"\n   Endpoint : {ENDPOINT}")
    print(f"   AccessKey: {ACCESS_KEY}")
    print(f"   SecretKey: {SECRET_KEY}")
    print(f"   Bucket   : {BUCKET}")

except Exception as e:
    import traceback
    print(f"\n❌ {type(e).__name__}: {e}")
    traceback.print_exc()
