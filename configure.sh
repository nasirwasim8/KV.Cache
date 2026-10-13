#!/bin/bash
# Pre-configure Infinia credentials for KV Cache Observatory
ENDPOINT_URL="${INFINIA_ENDPOINT:-https://127.0.0.1:8111}"
ACCESS_KEY="${INFINIA_ACCESS_KEY:-}"
SECRET_KEY="${INFINIA_SECRET_KEY:-}"
BUCKET_NAME="${INFINIA_BUCKET:-ddn-kv-cache-01}"
REGION="${INFINIA_REGION:-us-east-1}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "Error: Infinia credentials not provided."
  echo "Usage: INFINIA_ACCESS_KEY=<key> INFINIA_SECRET_KEY=<secret> ./configure.sh"
  echo "Or set INFINIA_ACCESS_KEY and INFINIA_SECRET_KEY in your environment / .env file."
  exit 1
fi

echo "Saving Infinia configuration to backend..."
curl -s -X POST http://localhost:8002/api/config/save \
  -H "Content-Type: application/json" \
  -d "{\"endpoint_url\":\"${ENDPOINT_URL}\",\"access_key\":\"${ACCESS_KEY}\",\"secret_key\":\"${SECRET_KEY}\",\"bucket_name\":\"${BUCKET_NAME}\",\"region\":\"${REGION}\",\"ollama_url\":\"${OLLAMA_URL}\",\"ollama_model\":\"${OLLAMA_MODEL}\"}"
echo ""

echo "Testing Infinia connection..."
curl -s -X POST http://localhost:8002/api/config/test \
  -H "Content-Type: application/json" \
  -d "{\"endpoint_url\":\"${ENDPOINT_URL}\",\"access_key\":\"${ACCESS_KEY}\",\"secret_key\":\"${SECRET_KEY}\",\"bucket_name\":\"${BUCKET_NAME}\",\"region\":\"${REGION}\",\"ollama_url\":\"${OLLAMA_URL}\",\"ollama_model\":\"${OLLAMA_MODEL}\"}"
echo ""
