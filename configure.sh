#!/bin/bash
# Pre-configure Infinia credentials for KV Cache Observatory
curl -s -X POST http://localhost:8002/api/config/save \
  -H "Content-Type: application/json" \
  -d "{\"endpoint_url\":\"https://192.168.147.129:8111\",\"access_key\":\"0099L39GNX7TBC76NTVV\",\"secret_key\":\"OXSzBP1TH5Pz0Hon2Ovn43b0gMZbKeoosZfFPO45\",\"bucket_name\":\"ddn-kv-cache-01\",\"region\":\"us-east-1\",\"ollama_url\":\"http://localhost:11434\",\"ollama_model\":\"llama3.2:3b\"}"
echo ""
echo "Testing Infinia connection..."
curl -s -X POST http://localhost:8002/api/config/test \
  -H "Content-Type: application/json" \
  -d "{\"endpoint_url\":\"https://192.168.147.129:8111\",\"access_key\":\"0099L39GNX7TBC76NTVV\",\"secret_key\":\"OXSzBP1TH5Pz0Hon2Ovn43b0gMZbKeoosZfFPO45\",\"bucket_name\":\"ddn-kv-cache-01\",\"region\":\"us-east-1\",\"ollama_url\":\"http://localhost:11434\",\"ollama_model\":\"llama3.2:3b\"}"
echo ""
