import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 120_000 })

export interface InfiniaConfig {
  endpoint_url: string
  access_key: string
  secret_key: string
  bucket_name: string
  region: string
  ollama_url: string
  ollama_model: string
}

export interface ChatRequest {
  session_id: string
  message: string
  demo_mode: string
}

export interface ChatResponse {
  response: string
  cache_hit: boolean
  cache_key: string
  left: PanelMetrics
  right: PanelMetrics
  savings: SavingsMetrics
  session_stats: { turns: number }
}

export interface PanelMetrics {
  ttft_ms: number
  total_ms: number
  tokens_sent: number
  cost_usd: number
  source: string                   // 'GPU_COMPUTED' | 'INFINIA_CACHE' | 'FIRST_MISS_STORED'
  infinia_latency_ms?: number
  store_latency_ms?: number
  response_tokens: number
  cache_key_preview?: string
  history_turns?: number
}

export interface SavingsMetrics {
  cost_usd: number
  pct: number
  speedup_x: number
  tokens_saved: number
}

export const kvApi = {
  getHealth: () => api.get('/health').then(r => r.data),

  getConfig: () => api.get('/config').then(r => r.data),
  saveConfig: (cfg: InfiniaConfig) => api.post('/config/save', cfg).then(r => r.data),
  testConfig: (cfg: InfiniaConfig) => api.post('/config/test', cfg).then(r => r.data),

  sendChat: (req: ChatRequest): Promise<ChatResponse> =>
    api.post('/chat/send', req).then(r => r.data),
  clearSession: (id: string) => api.delete(`/chat/session/${id}`).then(r => r.data),

  getScenarios: () => api.get('/prefix/scenarios').then(r => r.data),
  seedPrefix: (use_case: string) => api.post('/prefix/seed', { use_case }).then(r => r.data),
  runPrefix: (use_case: string, query: string, request_number: number) =>
    api.post('/prefix/run', { use_case, query, request_number }).then(r => r.data),

  getCacheStats: () => api.get('/cache/stats').then(r => r.data),
}
