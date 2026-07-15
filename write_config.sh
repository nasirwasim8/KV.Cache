#!/bin/bash
# Write Infinia config to WSL location
cat > /home/nwasim/projects/ddn-kv-cache/backend/kv_config.json << 'ENDOFCONFIG'
{
  "infinia_endpoint": "https://192.168.147.129:8111",
  "infinia_access_key": "0099L39GNX7TBC76NTVV",
  "infinia_secret_key": "OXSzBP1TH5Pz0Hon2Ovn43b0gMZbKeoosZfFPO45",
  "infinia_bucket": "ddn-kv-cache-01",
  "infinia_region": "us-east-1",
  "ollama_url": "http://localhost:11434",
  "ollama_model": "llama3.2:3b"
}
ENDOFCONFIG
echo "Config written OK"
cat /home/nwasim/projects/ddn-kv-cache/backend/kv_config.json
