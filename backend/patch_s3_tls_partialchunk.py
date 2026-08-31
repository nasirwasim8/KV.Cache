#!/usr/bin/env python3
"""
Patch 2: Fix TLS (always verify_peer=False) + allow partial chunk uploads to S3.

Issues found in first attempt:
1. TLS verification fix was ONLY applied when s3_prefer_http2=True.
   With s3_prefer_http2=False, tls_opts=None → awscrt uses default TLS which
   verifies the server certificate → self-signed Infinia cert fails TLS handshake.
   Fix: Always create TlsConnectionOptions with verify_peer=False when TLS is enabled.

2. Partial chunk upload rejected by size check:
   "chunk size X bytes does not match S3 part size 33554432"
   The S3Connector rejects partial chunks even when save_unfull_chunk=True.
   The check is too strict — S3 PutObject accepts any size, only multipart needs
   fixed part sizes. Fix: skip the validation check for partial chunks (< s3_part_size).
"""

S3_CONNECTOR = "/home/nwasim/dynamo-env/lib/python3.12/site-packages/lmcache/v1/storage_backend/connector/s3_connector.py"

with open(S3_CONNECTOR, 'r') as f:
    src = f.read()

print("=== Current state ===")
print("Has path-style patch:", "s3_bucket_prefix" in src)
print("Has always-TLS patch:", "Always create TLS" in src)
print("Has partial-chunk patch:", "skip size validation for partial" in src.lower() or "partial chunk" in src.lower())
print()

# ─── Fix 1: Always create TLS context with verify_peer=False ──────────────────
OLD_TLS = """        tls_opts = None

        if self.s3_prefer_http2:
            # Use HTTP/2 multiplexing if possible.
            tls_ctx_opts = TlsContextOptions(); tls_ctx_opts.verify_peer = False; tls_ctx = ClientTlsContext(tls_ctx_opts)
            tls_opts = TlsConnectionOptions(tls_ctx)
            try:
                tls_opts.set_alpn_list(["h2", "http/1.1"])
            except Exception:
                tls_opts = None"""

NEW_TLS = """        # Always create TLS context with verify_peer=False for non-AWS S3-compatible
        # endpoints (e.g., DDN Infinia, MinIO) that use self-signed certificates.
        # Without this, awscrt defaults to system CA verification → TLS failure.
        tls_ctx_opts = TlsContextOptions()
        tls_ctx_opts.verify_peer = False
        tls_ctx = ClientTlsContext(tls_ctx_opts)
        tls_opts = TlsConnectionOptions(tls_ctx)

        if self.s3_prefer_http2:
            # Use HTTP/2 multiplexing if possible.
            try:
                tls_opts.set_alpn_list(["h2", "http/1.1"])
            except Exception:
                # Fallback: reset to HTTP/1.1-only TLS options
                tls_opts = TlsConnectionOptions(tls_ctx)"""

if OLD_TLS in src:
    src = src.replace(OLD_TLS, NEW_TLS)
    print("✓ TLS fix: always apply verify_peer=False regardless of s3_prefer_http2")
else:
    print("✗ TLS fix: pattern not found (may already be applied)")

# ─── Fix 2: Allow partial chunk uploads (skip strict size validation) ──────────
OLD_PARTIAL = """        # Check if the chunk size matches expected S3 part size
        if memory_obj.get_physical_size() != self.s3_part_size:
            logger.error(
                "Cannot upload %s: chunk size %s "
                "bytes does not match S3 part size %s bytes. "
                "Partial/unfull chunks are not supported.",
                key_str,
                memory_obj.get_physical_size(),
                self.s3_part_size,
            )
            return"""

NEW_PARTIAL = """        # Allow partial chunks (size < s3_part_size) — S3 PutObject accepts any size.
        # Only reject chunks LARGER than expected (which would indicate a bug).
        chunk_physical_size = memory_obj.get_physical_size()
        if chunk_physical_size > self.s3_part_size:
            logger.error(
                "Cannot upload %s: chunk size %s bytes exceeds S3 part size %s bytes.",
                key_str, chunk_physical_size, self.s3_part_size,
            )
            return
        if chunk_physical_size < self.s3_part_size:
            logger.debug(
                "Uploading partial chunk %s: %s bytes (full chunk = %s bytes).",
                key_str, chunk_physical_size, self.s3_part_size,
            )"""

if OLD_PARTIAL in src:
    src = src.replace(OLD_PARTIAL, NEW_PARTIAL)
    print("✓ Partial chunk fix: skip strict size check, allow partial uploads")
else:
    print("✗ Partial chunk fix: pattern not found (may already be applied)")

with open(S3_CONNECTOR, 'w') as f:
    f.write(src)
print("✓ s3_connector.py written")

print("\n=== Verification ===")
print("verify_peer=False always:", "Always create TLS" in src)
print("Partial chunk allowed:", "partial chunk" in src.lower())
