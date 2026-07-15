#!/bin/bash
# Turn 1: First ask - expect MISS
echo "=== TURN 1 (expect MISS) ==="
curl -s -X POST http://localhost:8002/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test_fix","message":"What is DDN Infinia?","demo_mode":"business"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('cache_hit:', d['cache_hit'])
print('source:', d['right']['source'])
print('cache_key:', d['cache_key'])
print('Left TTFT:', d['left']['ttft_ms'], 'ms')
print('Right TTFT:', d['right']['ttft_ms'], 'ms')
print('Left tokens:', d['left']['tokens_sent'])
print('Right tokens:', d['right']['tokens_sent'])
"

sleep 1
echo ""
echo "=== TURN 2 (same question - expect INFINIA HIT) ==="
curl -s -X POST http://localhost:8002/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test_fix","message":"What is DDN Infinia?","demo_mode":"business"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('cache_hit:', d['cache_hit'])
print('source:', d['right']['source'])
print('Left TTFT:', d['left']['ttft_ms'], 'ms  <-- GPU recompute')
print('Right TTFT:', d['right']['ttft_ms'], 'ms  <-- Infinia S3 GET')
print('Left tokens:', d['left']['tokens_sent'], '(growing)')
print('Right tokens:', d['right']['tokens_sent'], '(just the question)')
print('Speedup:', d['savings']['speedup_x'], 'x')
print('Savings:', d['savings']['pct'], '%')
print()
if d['right']['source'] == 'INFINIA_CACHE':
    print('SUCCESS: Cache hit working correctly!')
else:
    print('ISSUE: Expected INFINIA_CACHE got', d['right']['source'])
"
