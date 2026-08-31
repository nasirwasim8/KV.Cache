#!/usr/bin/env python3
"""Test Infinia over HTTP (not HTTPS) and also test virtual-hosted style."""
import boto3, urllib3
urllib3.disable_warnings()

ACCESS = "DJ1S7LSGEIT9AKYCWVL5"
SECRET = "wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu"
BUCKET = "ddn-kv-cache-01"

# Test 1: HTTP
print("Testing HTTP http://192.168.147.129:8111 ...")
try:
    s3 = boto3.client('s3',
        endpoint_url='http://192.168.147.129:8111',
        aws_access_key_id=ACCESS,
        aws_secret_access_key=SECRET,
        verify=False,
    )
    r = s3.list_buckets()
    print(f"HTTP: OK — buckets: {[b['Name'] for b in r['Buckets']]}")
except Exception as e:
    print(f"HTTP: FAILED — {e}")

# Test 2: HTTPS (already known to work)
print("\nTesting HTTPS https://192.168.147.129:8111 ...")
try:
    s3h = boto3.client('s3',
        endpoint_url='https://192.168.147.129:8111',
        aws_access_key_id=ACCESS,
        aws_secret_access_key=SECRET,
        verify=False,
    )
    r2 = s3h.list_buckets()
    print(f"HTTPS: OK — buckets: {[b['Name'] for b in r2['Buckets']]}")
except Exception as e:
    print(f"HTTPS: FAILED — {e}")

# Test 3: Virtual-hosted style — does Infinia respond to host header like ddn-kv-cache-01.192.168.147.129:8111 ?
print("\nTesting virtual-hosted header ...")
try:
    import urllib3
    http = urllib3.HTTPSConnectionPool('192.168.147.129', port=8111, cert_reqs='CERT_NONE')
    r3 = http.request('GET', '/', headers={'Host': f'{BUCKET}.192.168.147.129:8111'})
    print(f"Virtual-hosted HTTPS: status={r3.status}, body={r3.data[:200]}")
except Exception as e:
    print(f"Virtual-hosted: FAILED — {e}")

print("\n=== awscrt available? ===")
try:
    import awscrt
    print(f"awscrt: {awscrt.__version__}")
    from awscrt.s3 import S3Client
    print("S3Client importable")
except Exception as e:
    print(f"awscrt: {e}")
