#!/usr/bin/env python3
"""Check awscrt TLS options and test S3 connection to Infinia."""
from awscrt.io import ClientTlsContext, TlsConnectionOptions, TlsContextOptions
import inspect, awscrt

print("awscrt version:", awscrt.__version__)
print("\nTlsContextOptions dir:", [x for x in dir(TlsContextOptions) if not x.startswith('__')])
print("\nTlsContextOptions source snippet:")
try:
    src = inspect.getsource(TlsContextOptions)
    print(src[:2000])
except:
    pass

# Try to create TLS context with verify=False
print("\n=== Test TlsContextOptions.create_client_with_mtls ===")
try:
    opts = TlsContextOptions()
    print("Default TlsContextOptions created")
    print("  verify_peer attr?:", hasattr(opts, 'verify_peer'))
    if hasattr(opts, 'verify_peer'):
        print(f"  verify_peer = {opts.verify_peer}")
        opts.verify_peer = False
        print("  Set verify_peer=False: OK")
except Exception as e:
    print(f"Error: {e}")

# Test with certificate override
print("\n=== Fetch Infinia cert ===")
import subprocess
r = subprocess.run(
    ['openssl', 's_client', '-connect', '192.168.147.129:8111', '-showcerts'],
    input=b'', capture_output=True, timeout=5
)
cert_output = r.stdout.decode(errors='ignore')
# Extract cert
import re
certs = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', cert_output, re.DOTALL)
if certs:
    print(f"Found {len(certs)} cert(s)")
    with open('/tmp/infinia_cert.pem', 'w') as f:
        f.write('\n'.join(certs))
    print("Saved to /tmp/infinia_cert.pem")
    # Show cert info
    r2 = subprocess.run(['openssl', 'x509', '-in', '/tmp/infinia_cert.pem', '-noout', '-subject', '-issuer', '-dates'],
                        capture_output=True, text=True)
    print(r2.stdout)
else:
    print("No certs found in output")
    print("Output:", cert_output[:500])
