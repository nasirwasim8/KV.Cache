#!/bin/bash
# Write Infinia config template to backend/kv_config.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backend/kv_config.json"

ENDPOINT_URL="${INFINIA_ENDPOINT:-https://127.0.0.1:8111}"
ACCESS_KEY="${INFINIA_ACCESS_KEY:-YOUR_INFINIA_ACCESS_KEY}"
SECRET_KEY="${INFINIA_SECRET_KEY:-YOUR_INFINIA_SECRET_KEY}"
BUCKET_NAME="${INFINIA_BUCKET:-ddn-kv-cache-01}"
REGION="${INFINIA_REGION:-us-east-1}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

cat > "$CONFIG_FILE" << ENDOFCONFIG
{
  "infinia_endpoint": "${ENDPOINT_URL}",
  "infinia_access_key": "${ACCESS_KEY}",
  "infinia_secret_key": "${SECRET_KEY}",
  "infinia_bucket": "${BUCKET_NAME}",
  "infinia_region": "${REGION}",
  "ollama_url": "${OLLAMA_URL}",
  "ollama_model": "${OLLAMA_MODEL}"
}
ENDOFCONFIG

echo "Config template written to $CONFIG_FILE"
