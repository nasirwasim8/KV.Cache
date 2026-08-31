#!/usr/bin/env python3
"""Check if awscrt S3Client supports path-style and test with Infinia."""
from awscrt import s3, io, auth
import inspect, json

print("=== awscrt S3Client signature ===")
try:
    sig = inspect.signature(s3.S3Client.__init__)
    for name, param in sig.parameters.items():
        if name != 'self':
            print(f"  {name}: default={param.default!r}")
except Exception as e:
    print(f"Can't inspect S3Client: {e}")

print("\n=== awscrt S3RequestType ===")
try:
    print(dir(s3.S3RequestType))
except:
    pass

print("\n=== Test path-style S3 with awscrt ===")
# Try to build a path-style S3 request manually using awscrt's S3Client
# Path-style URL: host=192.168.147.129:8111, path=/ddn-kv-cache-01/test-object

try:
    from awscrt.io import (
        ClientBootstrap, DefaultHostResolver, EventLoopGroup,
        ClientTlsContext, TlsContextOptions, TlsConnectionOptions
    )
    from awscrt import auth as crt_auth

    el_group = EventLoopGroup(1)
    host_resolver = DefaultHostResolver(el_group)
    bootstrap = ClientBootstrap(el_group, host_resolver)

    # Static credentials
    credentials_provider = crt_auth.AwsCredentialsProvider.new_static(
        access_key_id="DJ1S7LSGEIT9AKYCWVL5",
        secret_access_key="wZ7WQPZyqePwBzhuoQeCQJFRheblRTjwF687KMKu",
    )

    # TLS with verify=False
    tls_opts = TlsContextOptions()
    tls_opts.verify_peer = False
    tls_ctx = ClientTlsContext(tls_opts)
    tls_conn_opts = TlsConnectionOptions(tls_ctx)

    # Try creating S3Client with the Infinia IP directly (no bucket in URL)
    # This would be path-style if supported
    s3_client = s3.S3Client(
        bootstrap=bootstrap,
        region="us-east-1",
        tls_connection_options=tls_conn_opts,
        tls_mode=s3.S3RequestTlsMode.ENABLED,
        credentials_provider=credentials_provider,
    )
    print("  S3Client created successfully")

    # Try making a path-style GET request: IP:port/bucket/key
    import asyncio
    from awscrt.http import HttpHeaders, HttpRequest

    # Build a signed request for path-style
    result = {"done": False, "status": None, "error": None, "body": b""}

    def on_response(status_code, headers, **kwargs):
        result["status"] = status_code
        print(f"  Response status: {status_code}")

    def on_body(chunk, **kwargs):
        result["body"] += chunk

    def on_done(future):
        result["done"] = True
        if future.exception():
            result["error"] = str(future.exception())

    headers = HttpHeaders([
        ("Host", "192.168.147.129:8111"),
        ("Content-Type", "application/xml"),
    ])
    # Path-style: /bucket/ to list bucket contents
    req = HttpRequest("GET", "/ddn-kv-cache-01/?max-keys=5", headers)

    future = s3_client.make_request(
        request=req,
        type=s3.S3RequestType.DEFAULT,
        signing_config=crt_auth.AwsSigningConfig(
            algorithm=crt_auth.AwsSigningAlgorithm.V4,
            region="us-east-1",
            service="s3",
            credentials_provider=credentials_provider,
        ),
        recv_filepath=None,
        on_headers=on_response,
        on_body=on_body,
    )
    import time
    deadline = time.time() + 10
    while not result["done"] and time.time() < deadline:
        time.sleep(0.1)
    print(f"  Done: {result['done']}")
    print(f"  Error: {result['error']}")
    print(f"  Body: {result['body'][:300]}")
except Exception as e:
    import traceback
    print(f"  Error: {e}")
    traceback.print_exc()
