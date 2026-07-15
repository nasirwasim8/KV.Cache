module.exports = {
  apps: [
    // ── KV Cache Backend (FastAPI + Uvicorn, port 8002) ────────────────────
    {
      name: "ddn-kvc-backend",
      script: "/home/nwasim/projects/ddn-kv-cache/backend/venv/bin/uvicorn",
      args: "main:app --host 0.0.0.0 --port 8002 --workers 1",
      cwd: "/home/nwasim/projects/ddn-kv-cache/backend",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      max_memory_restart: "2G",
      env: {
        PYTHONUNBUFFERED: "1",
        INFINIA_ACCESS_KEY: "0099L39GNX7TBC76NTVV",
        INFINIA_SECRET_KEY: "OXSzBP1TH5Pz0Hon2Ovn43b0gMZbKeoosZfFPO45",
        INFINIA_BUCKET: "ddn-kv-cache-01",
        INFINIA_ENDPOINT: "https://192.168.147.129:8111",
        INFINIA_REGION: "us-east-1",
        OLLAMA_URL: "http://localhost:11434",
        OLLAMA_MODEL: "llama3.2:3b"
      },
      error_file: "/home/nwasim/projects/ddn-kv-cache/logs/backend-error.log",
      out_file:   "/home/nwasim/projects/ddn-kv-cache/logs/backend-out.log",
      merge_logs: true
    },

    // ── KV Cache Frontend (Vite dev server, port 5176) ─────────────────────
    {
      name: "ddn-kvc-frontend",
      cwd: "/home/nwasim/projects/ddn-kv-cache/frontend",
      script: "npm",
      args: "run dev -- --host 0.0.0.0 --port 5176",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development"
      },
      error_file: "/home/nwasim/projects/ddn-kv-cache/logs/frontend-error.log",
      out_file:   "/home/nwasim/projects/ddn-kv-cache/logs/frontend-out.log",
      merge_logs: true
    }
  ]
};
