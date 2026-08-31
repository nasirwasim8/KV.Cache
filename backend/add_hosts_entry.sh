#!/bin/bash
# Add /etc/hosts entry for LMCache S3 virtual-hosted DNS resolution
ENTRY="192.168.147.129 ddn-kv-cache-01.192.168.147.129"
if grep -q "ddn-kv-cache-01" /etc/hosts; then
    echo "Entry already exists in /etc/hosts:"
    grep "ddn-kv-cache-01" /etc/hosts
else
    echo "$ENTRY" | sudo tee -a /etc/hosts
    echo "Added: $ENTRY"
fi
# Verify resolution works
echo ""
echo "DNS resolution test:"
getent hosts ddn-kv-cache-01.192.168.147.129 || echo "Not yet resolving"
