#!/bin/bash
curl -s -X POST http://localhost:8002/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"session_id":"debug1","message":"test blank screen fix","demo_mode":"business","pricing_tier":"self_hosted_h100"}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
io = d.get('infinia_object', {})
print('=== infinia_object ===')
print(json.dumps(io, indent=2))
print()
print('cache_hit:', d['cache_hit'])
print('source:', d['right']['source'])
"
