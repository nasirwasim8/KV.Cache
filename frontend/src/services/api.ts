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

export type PricingTier = 'self_hosted_h100' | 'cloud_openai' | 'cloud_anthropic'

export const PRICING_TIERS: Record<PricingTier, {
  label: string; short: string; color: string
  input_per_1m: number; output_per_1m: number; cache_discount: number
  note: string
}> = {
  self_hosted_h100: {
    label: 'Self-hosted H100 (Llama)',
    short: 'H100',
    color: '#00C280',
    input_per_1m: 0.70,
    output_per_1m: 2.80,
    cache_discount: 0.0,  // 100% FREE — skipped entirely
    note: 'Cached tokens bypass GPU entirely. Zero recompute cost.',
  },
  cloud_openai: {
    label: 'Cloud API — GPT-4o rates',
    short: 'GPT-4o',
    color: '#1A81AF',
    input_per_1m: 2.50,
    output_per_1m: 10.00,
    cache_discount: 0.50,  // 50% discount (OpenAI prompt caching)
    note: 'OpenAI charges 50% for cached input tokens.',
  },
  cloud_anthropic: {
    label: 'Cloud API — Claude 3.5 rates',
    short: 'Claude 3.5',
    color: '#7B61FF',
    input_per_1m: 3.00,
    output_per_1m: 15.00,
    cache_discount: 0.10,  // 90% discount (Anthropic prompt caching)
    note: 'Anthropic charges only 10% for cached input tokens.',
  },
}

export interface ChatRequest {
  session_id: string
  message: string
  demo_mode: string
  pricing_tier?: PricingTier
}

export interface ChatResponse {
  response: string
  cache_hit: boolean
  cache_key: string
  left: PanelMetrics
  right: PanelMetrics
  savings: SavingsMetrics
  pricing?: PricingInfo
  session_stats: { turns: number }
}

export interface PanelMetrics {
  ttft_ms: number
  total_ms: number
  tokens_sent: number
  tokens_cached?: number        // how many tokens were FREE on cache hit
  cost_usd: number
  source: string                // 'GPU_COMPUTED' | 'INFINIA_CACHE' | 'FIRST_MISS_STORED'
  infinia_latency_ms?: number
  store_latency_ms?: number
  response_tokens: number
  cache_key_preview?: string
  history_turns?: number
  pricing_tier?: string
}

export interface SavingsMetrics {
  cost_usd: number
  pct: number
  speedup_x: number
  tokens_saved: number
  input_tokens_billed_left?: number
  input_tokens_billed_right?: number
}

export interface PricingInfo {
  tier: string
  tier_label: string
  input_per_1m: number
  output_per_1m: number
  cache_discount: number
}

export const kvApi = {
  getHealth: () => api.get('/health').then(r => r.data),

  getConfig: () => api.get('/config').then(r => r.data),
  saveConfig: (cfg: InfiniaConfig) => api.post('/config/save', cfg).then(r => r.data),
  testConfig: (cfg: InfiniaConfig) => api.post('/config/test', cfg).then(r => r.data),

  sendChat: (req: ChatRequest): Promise<ChatResponse> =>
    api.post('/chat/send', req).then(r => r.data),
  clearSession: (id: string) => api.delete(`/chat/session/${id}`).then(r => r.data),
  getSessionHistory: (id: string) => api.get(`/chat/session/${id}/history`).then(r => r.data),
  persistSession: (id: string) => api.post(`/chat/session/${id}/persist`).then(r => r.data),

  getScenarios: () => api.get('/prefix/scenarios').then(r => r.data),
  seedPrefix: (use_case: string) => api.post('/prefix/seed', { use_case }).then(r => r.data),
  runPrefix: (use_case: string, query: string, request_number: number) =>
    api.post('/prefix/run', { use_case, query, request_number }).then(r => r.data),

  getCacheStats: () => api.get('/cache/stats').then(r => r.data),
  purgeInfiniaCache: () => api.delete('/cache/purge-infinia').then(r => r.data),
}
