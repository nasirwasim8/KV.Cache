import { useState, useRef, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import { Send, Trash2, Zap, Database, ToggleLeft, ToggleRight, Info, Upload, Download, ChevronDown, ChevronUp, DollarSign, Hash, RotateCcw, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { kvApi, ChatResponse, PanelMetrics, PricingTier, PRICING_TIERS } from '../services/api'
import VllmResourceGuard from '../components/VllmResourceGuard'

// ─── Error Boundary ────────────────────────────────────────────────────────────

class TurnErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  componentDidCatch(e: Error, _i: ErrorInfo) { console.error('TurnRow crash:', e) }
  render() {
    if (this.state.error) {
      return (
        <div className="p-3 m-2 rounded-xl text-xs" style={{ background: 'rgba(237,39,56,0.06)', border: '1px solid rgba(237,39,56,0.2)', color: '#ED2738' }}>
          <strong>Display error (response was received OK):</strong> {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

// safe number formatter — never crashes on undefined/null/NaN/Infinity
const n = (v: unknown, dec = 0): string => {
  if (v == null || typeof v !== 'number' || !isFinite(v)) return '—'
  return v.toFixed(dec)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfiniaObject {
  operation: 'PUT' | 'GET'
  s3_key: string
  s3_bucket: string
  s3_endpoint: string
  size_kb: number
  size_bytes: number
  cached_at: string
  context_tokens: number
  query_preview: string
  response_preview: string
  full_tokens: number
  compute_ms: number
  store_latency_ms: number
}

interface Turn {
  id: string
  userMessage: string
  response: string
  timestamp: number
  cacheHit: boolean
  normalizedQuery?: string
  left: PanelMetrics
  right: PanelMetrics
  savings: { cost_usd: number; pct: number; speedup_x: number; tokens_saved: number }
  pricing?: { tier: string; tier_label: string; input_per_1m: number; output_per_1m: number; cache_discount: number }
  infinia_object?: InfiniaObject
}

// ─── Infinia Object Inspector ──────────────────────────────────────────────────

function InfiniaObjectCard({ obj }: { obj: InfiniaObject }) {
  const [open, setOpen] = useState(false)
  if (!obj || !obj.operation) return null

  const isPut  = obj.operation === 'PUT'
  const color  = isPut ? '#1A81AF' : '#00C280'
  const Icon   = isPut ? Upload : Download
  const label  = isPut ? '📤 Stored in DDN Infinia' : '📥 Retrieved from DDN Infinia'
  const opLabel = isPut ? 'S3 PUT' : 'S3 GET'

  const fms  = (v: unknown) => typeof v === 'number' ? v.toFixed(1) : '—'
  const fint = (v: unknown) => typeof v === 'number' ? v.toLocaleString() : '—'
  const fstr = (v: unknown) => (v != null ? String(v) : '—')

  const cachedAt = (() => {
    try { return obj.cached_at ? new Date(obj.cached_at).toLocaleTimeString() : '—' }
    catch { return fstr(obj.cached_at) }
  })()

  const endpoint = obj.s3_endpoint
    ? String(obj.s3_endpoint).replace('https://', '').replace('http://', '')
    : '—'

  const rows = [
    { k: 'Bucket',                  v: fstr(obj.s3_bucket) },
    { k: 'Object Key',              v: fstr(obj.s3_key) },
    { k: 'Endpoint',                v: endpoint },
    { k: 'Object Size',             v: `${fint(obj.size_bytes)} bytes  (${fstr(obj.size_kb)} KB)` },
    { k: 'Stored At (UTC)',         v: cachedAt },
    { k: isPut ? 'Write Latency' : 'Read Latency', v: `${fms(obj.store_latency_ms)} ms` },
    { k: 'KV State Tokens',         v: `${fint(obj.context_tokens)} token IDs` },
    { k: 'Input Tokens (original)', v: `${fint(obj.full_tokens)} tokens` },
    { k: 'GPU Compute (original)',  v: `${fms(obj.compute_ms)} ms` },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="mt-2 rounded-xl overflow-hidden border-2"
      style={{ borderColor: `${color}40`, background: `${color}06` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
      >
        <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: `${color}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold" style={{ color }}>{label}</div>
          <div className="text-xs font-mono text-neutral-500 truncate">
            {fstr(obj.s3_bucket)} / {fstr(obj.s3_key)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
            style={{ background: `${color}15`, color }}>{opLabel}</span>
          <span className="text-xs text-neutral-400">{fstr(obj.size_kb)} KB</span>
          {open ? <ChevronUp className="w-3 h-3 text-neutral-400" />
                : <ChevronDown className="w-3 h-3 text-neutral-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: `${color}20` }}>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {rows.map(row => (
                  <div key={row.k} className="p-2 rounded-lg" style={{ background: `${color}08` }}>
                    <div className="font-semibold text-neutral-500"
                      style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {row.k}
                    </div>
                    <div className="text-xs font-mono font-medium text-neutral-800 mt-0.5 break-all">
                      {row.v}
                    </div>
                  </div>
                ))}
              </div>

              {obj.response_preview && (
                <div className="p-2 rounded-lg" style={{ background: `${color}08` }}>
                  <div className="font-semibold text-neutral-500 mb-1"
                    style={{ fontSize: '9px', textTransform: 'uppercase' }}>Cached Response Preview</div>
                  <div className="text-xs text-neutral-700 italic leading-relaxed">
                    &ldquo;{obj.response_preview}&rdquo;
                  </div>
                </div>
              )}

              <div className="p-2 rounded-lg text-xs"
                style={{ background: 'rgba(128,119,120,0.06)', border: '1px solid rgba(128,119,120,0.15)' }}>
                <span className="font-semibold text-neutral-600">What is the KV state? </span>
                <span className="text-neutral-500">
                  {fint(obj.context_tokens)} integer token IDs — the Key+Value attention matrices
                  for every input token. On a cache hit these are passed back to the LLM,
                  skipping re-processing of all {fint(obj.full_tokens)} input tokens.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, highlight, icon: Icon, subtext }: {
  label: string; value: string | number; unit?: string; highlight?: 'green' | 'red' | 'blue'; icon?: any; subtext?: string
}) {
  const colors = {
    green: { bg: 'rgba(0,194,128,0.08)', text: '#00C280', border: 'rgba(0,194,128,0.2)' },
    red:   { bg: 'rgba(237,39,56,0.08)', text: '#ED2738', border: 'rgba(237,39,56,0.2)' },
    blue:  { bg: 'rgba(26,129,175,0.08)', text: '#1A81AF', border: 'rgba(26,129,175,0.2)' },
  }
  const c = highlight ? colors[highlight] : null
  return (
    <div className="metric-card" style={c ? { background: c.bg, borderColor: c.border } : {}}>
      {Icon && <Icon className="w-4 h-4 mb-2" style={{ color: c ? c.text : 'var(--text-muted)' }} />}
      <div className="metric-value" style={{ fontSize: '1.4rem', color: c ? c.text : 'var(--text-primary)' }}>
        {value}{unit && <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      <div className="metric-label">{label}</div>
      {subtext && (
        <div className="text-[10px] mt-0.5 truncate opacity-75 font-normal" style={{ color: c ? c.text : 'var(--text-muted)' }} title={subtext}>
          {subtext}
        </div>
      )}
    </div>
  )
}

// ─── PanelHeader ──────────────────────────────────────────────────────────────

function PanelHeader({ title, subtitle, isCache, source, latency }: {
  title: string; subtitle: string; isCache: boolean; source?: string; latency?: number
}) {
  const isHit  = source === 'INFINIA_CACHE'
  const isMiss = source === 'FIRST_MISS_STORED'
  return (
    <div className={`p-4 border-b ${isCache ? (isHit ? 'panel-cached' : 'panel-nocache') : 'panel-nocache'}`} style={{ borderBottomColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isCache ? (isHit ? '✅' : '◯') : '❌'}</span>
          <div>
            <div className="font-semibold text-sm text-neutral-900">{title}</div>
            <div className="text-xs text-neutral-500">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCache && isHit && (
            <>
              <div className="badge badge-success text-xs">INFINIA HIT</div>
              {latency !== undefined && <div className="text-xs font-mono" style={{ color: '#00C280' }}>{n(latency)}ms</div>}
            </>
          )}
          {isCache && isMiss && (
            <div className="badge badge-info text-xs">◯ MISS → STORED</div>
          )}
          {isCache && !isHit && !isMiss && source && (
            <div className="badge text-xs" style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>◯ MISS</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Preset Question Variations (Guaranteed Cache Hit Matches) ────────────────

export const PRESET_QUESTION_VARIATIONS: Record<string, string[]> = {
  'What is DDN Infinia?': [
    'What is DDN Infinia?',
    'DDN Infinia',
    'Explain DDN Infinia',
    'Tell me about DDN Infinia',
  ],
  'Explain KV cache in LLMs': [
    'Explain KV cache in LLMs',
    'KV cache in LLMs',
    'What is KV cache in LLMs?',
    'Tell me about KV cache in LLMs',
  ],
  'How does Infinia compare to storing KV cache in RAM?': [
    'How does Infinia compare to storing KV cache in RAM?',
    'Infinia compare to storing KV cache in RAM',
    'Explain Infinia compare to storing KV cache in RAM',
    'Tell me about Infinia compare to storing KV cache in RAM',
  ],
  'What is the cost benefit of prefix caching?': [
    'What is the cost benefit of prefix caching?',
    'Cost benefit of prefix caching',
    'Explain the cost benefit of prefix caching',
    'Tell me about the cost benefit of prefix caching',
  ],
  'Summarize the key benefits for enterprise AI': [
    'Summarize the key benefits for enterprise AI',
    'Key benefits for enterprise AI',
    'Explain the key benefits for enterprise AI',
    'What are the key benefits for enterprise AI?',
  ],
  'How does GPU memory eviction affect AI inference?': [
    'How does GPU memory eviction affect AI inference?',
    'GPU memory eviction affect AI inference',
    'Explain how GPU memory eviction affects AI inference',
    'Tell me about GPU memory eviction affect AI inference',
  ],
  'What happens when KV cache is stored on NVMe vs object storage?': [
    'What happens when KV cache is stored on NVMe vs object storage?',
    'KV cache stored on NVMe vs object storage',
    'Explain what happens when KV cache is stored on NVMe vs object storage',
    'Tell me about KV cache stored on NVMe vs object storage',
  ],
  'Explain the difference between prefill and decode in LLM inference': [
    'Explain the difference between prefill and decode in LLM inference',
    'Difference between prefill and decode in LLM inference',
    'What is the difference between prefill and decode in LLM inference?',
    'Tell me about the difference between prefill and decode in LLM inference',
  ],
  'Why does token count matter for GPU compute cost?': [
    'Why does token count matter for GPU compute cost?',
    'Token count matter for GPU compute cost',
    'Explain why token count matters for GPU compute cost',
    'Tell me why token count matters for GPU compute cost',
  ],
  'How does DDN Infinia handle concurrent AI sessions?': [
    'How does DDN Infinia handle concurrent AI sessions?',
    'DDN Infinia handle concurrent AI sessions',
    'Explain how DDN Infinia handles concurrent AI sessions',
    'Tell me about DDN Infinia handling concurrent AI sessions',
  ],
  'What is time-to-first-token and why does it matter?': [
    'What is time-to-first-token and why does it matter?',
    'Time-to-first-token and why does it matter',
    'What is TTFT and why does it matter?',
    'Explain time-to-first-token and why does it matter',
  ],
  'How does prefix caching reduce inference cost at scale?': [
    'How does prefix caching reduce inference cost at scale?',
    'Prefix caching reduce inference cost at scale',
    'Explain how prefix caching reduces inference cost at scale',
    'Tell me about prefix caching reduce inference cost at scale',
  ],
  'What is the latency overhead of retrieving KV cache from Infinia?': [
    'What is the latency overhead of retrieving KV cache from Infinia?',
    'Latency overhead of retrieving KV cache from Infinia',
    'Explain the latency overhead of retrieving KV cache from Infinia',
    'Tell me about the latency overhead of retrieving KV cache from Infinia',
  ],
  'How does caching help with multi-tenant AI deployments?': [
    'How does caching help with multi-tenant AI deployments?',
    'Caching help with multi-tenant AI deployments',
    'Explain how caching helps with multi-tenant AI deployments',
    'Tell me about caching help with multi-tenant AI deployments',
  ],
  'What makes DDN Infinia better than Redis for KV cache storage?': [
    'What makes DDN Infinia better than Redis for KV cache storage?',
    'DDN Infinia better than Redis for KV cache storage',
    'Explain what makes DDN Infinia better than Redis for KV cache storage',
    'Why is DDN Infinia better than Redis for KV cache storage?',
  ],
}

export function getQuestionVariations(query: string): string[] {
  if (!query) return []
  const clean = query.trim()
  if (PRESET_QUESTION_VARIATIONS[clean]) return PRESET_QUESTION_VARIATIONS[clean]

  const match = Object.keys(PRESET_QUESTION_VARIATIONS).find(k => k.toLowerCase() === clean.toLowerCase())
  if (match) return PRESET_QUESTION_VARIATIONS[match]

  const base = clean
    .replace(/[?.!]+$/, '')
    .replace(/^(please\s+)?(can\s+you\s+)?(explain|describe|summarize|summarise|tell\s+me\s+(about|how|why|what))\s+/i, '')
    .replace(/^(what\s+is\s+the|what\s+are\s+the|what\s+is|what\s+are|what\s+makes|what\s+happens\s+when|what\s+happens)\s+/i, '')
    .replace(/^(who\s+won|who\s+are|who\s+were|who\s+is|who\s+was)\s+/i, '')
    .replace(/^(how\s+do(?:es)?|how\s+can|how\s+would|how)\s+/i, '')
    .replace(/^(why\s+is|why\s+does|why\s+would|why)\s+/i, '')
    .replace(/^(is\s+there|are\s+there|does\s+it|do\s+they)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .trim()

  if (!base) return [clean]

  const out = [clean]
  if (base.toLowerCase() !== clean.toLowerCase()) out.push(base)
  out.push(`Explain ${base}`)
  out.push(`Tell me about ${base}`)
  return Array.from(new Set(out))
}

// ─── CostInfoTooltip ──────────────────────────────────────────────────────────

function CostInfoTooltip({ tier, isLeft, isHit }: { tier: PricingTier; isLeft?: boolean; isHit?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const p = PRICING_TIERS[tier]

  const nativeTitle = tier === 'self_hosted_h100'
    ? 'Self-Hosted Amortized Cost: Not an external API bill. Reflects GPU hardware & power ($3/hr). Cached tokens skip GPU prefill, freeing cluster capacity.'
    : tier === 'ncp_provider'
      ? 'Neocloud COGS: Direct infrastructure cost per inference stream. Offloading prefill expands tenant density and margins (45% → 87%).'
      : 'Commercial API Equivalence: Direct token billing benchmark ($2.50/1M input). Infinia caching is 100% free.'

  return (
    <div ref={ref} className="relative inline-flex items-center" style={{ verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center justify-center rounded-full transition-opacity cursor-pointer p-0.5"
        style={{ color: open ? p.color : 'var(--text-muted)' }}
        title={nativeTitle}
        aria-label="Cost model explanation"
      >
        <Info className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
      </button>

      {open && (
        <div
          className="absolute z-50 rounded-xl shadow-2xl text-left pointer-events-auto select-text font-sans"
          style={{
            bottom: '135%',
            right: isLeft ? 'auto' : '-10px',
            left: isLeft ? '-10px' : 'auto',
            width: 250,
            padding: '10px 12px',
            background: 'var(--surface-primary)',
            border: `1px solid ${p.color}40`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            lineHeight: '1.4',
            whiteSpace: 'normal',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="font-bold flex items-center justify-between gap-1 mb-1.5 pb-1 border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" style={{ color: p.color }} />
              <span>Cost Origin & Model</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold" style={{ background: `${p.color}15`, color: p.color }}>
              {p.short}
            </span>
          </div>

          {tier === 'self_hosted_h100' && (
            <div className="space-y-1.5 text-[10.5px]">
              <div className="font-semibold" style={{ color: '#76B900' }}>
                Self-Hosted / On-Prem Deployment
              </div>
              <p>
                <strong>Not an external API bill.</strong> Software and token licenses are $0, but physical compute is not.
              </p>
              <p>
                Reflects <strong>amortized GPU hardware & datacenter power (~$3.00/GPU-hr, ~700W)</strong>.
              </p>
              <p className="pt-1 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                {isLeft
                  ? 'Without Infinia, every turn forces full recomputation, burning GPU execution time.'
                  : isHit
                    ? '⚡ Cached tokens skip GPU prefill completely ($0 compute), freeing GPU headroom for other users.'
                    : 'Computed once and stored in Infinia — future requests skip GPU compute entirely.'}
              </p>
            </div>
          )}

          {tier === 'ncp_provider' && (
            <div className="space-y-1.5 text-[10.5px]">
              <div className="font-semibold" style={{ color: '#00C280' }}>
                Neocloud (GPUaaS) Infrastructure COGS
              </div>
              <p>
                Reflects direct infrastructure cost of serving inference requests.
              </p>
              <p>
                Eliminating prompt recompute on shared GPU clusters increases tenant density and boosts gross margins from <strong>45% to 87%</strong>.
              </p>
            </div>
          )}

          {tier === 'cloud_api' && (
            <div className="space-y-1.5 text-[10.5px]">
              <div className="font-semibold" style={{ color: '#1A81AF' }}>
                Commercial API Equivalence (Build vs Buy)
              </div>
              <p>
                Direct token billing benchmark ($2.50/1M input).
              </p>
              <p>
                While commercial APIs only offer 50% discount on cached tokens, Infinia on-prem prefix caching is <strong>100% free</strong>.
              </p>
            </div>
          )}

          {/* Little arrow */}
          <span style={{
            position: 'absolute', bottom: -5,
            right: isLeft ? 'auto' : 16,
            left: isLeft ? 16 : 'auto',
            transform: 'rotate(45deg)',
            width: 9, height: 9,
            background: 'var(--surface-primary)',
            border: `1px solid ${p.color}40`,
            borderTop: 'none', borderLeft: 'none',
          }} />
        </div>
      )}
    </div>
  )
}

// ─── TurnRow ──────────────────────────────────────────────────────────────────

function TurnRow({ turn, idx, onSelectQuestion, pricingTier = 'self_hosted_h100' }: { turn: Turn; idx: number; onSelectQuestion?: (q: string) => void; pricingTier?: PricingTier }) {
  const isHit  = turn.right?.source === 'INFINIA_CACHE'
  const isMiss = turn.right?.source === 'FIRST_MISS_STORED'
  const [expanded, setExpanded] = useState(false)

  // Derived values for business insights (only meaningful on cache hit)
  const totalTokens   = turn.left?.tokens_sent ?? 0
  const newTokens     = turn.right?.tokens_sent ?? 0
  const savedTokens   = turn.savings?.tokens_saved ?? 0
  const cachedPct     = totalTokens > 0 ? Math.round((savedTokens / totalTokens) * 100) : 0
  const speedup       = turn.savings?.speedup_x ?? 1
  // Auto-callout: TTFT improvement is modest (<2x) but token savings are large (>80%)
  const ttftNotStory  = isHit && speedup < 2 && cachedPct > 80

  return (
    <TurnErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.05 }}
        className="border-b last:border-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {/* User message */}
        <div className="flex justify-end p-3 flex-col items-end gap-1">
          <div className="chat-bubble-user">{turn.userMessage}</div>
          {turn.cacheHit && turn.normalizedQuery &&
           turn.normalizedQuery.toLowerCase() !== turn.userMessage.toLowerCase().replace(/[^\w\s]/g,'').replace(/\s+/g,' ').trim() && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,194,128,0.1)', color: '#00C280', border: '1px solid rgba(0,194,128,0.25)', fontSize: '10px' }}
              title="Query was normalized before cache lookup">
              <Zap className="w-2.5 h-2.5" />
              matched as: &ldquo;{turn.normalizedQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Side-by-side panels */}
        <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border-subtle)' }}>

          {/* LEFT — GPU HBM Only */}
          <div style={{ background: 'var(--surface-card)' }}>
            <PanelHeader title="GPU HBM Only" subtitle="No persistent cache · Full recompute on every session" isCache={false} source="GPU_COMPUTED" />
            <div className="p-3">
              <div className="chat-bubble-ai text-xs leading-relaxed mb-3">{turn.response}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="metric-card p-2" style={{ borderColor: 'rgba(237,39,56,0.2)', background: 'rgba(237,39,56,0.04)' }}>
                  <div className="font-mono text-sm font-bold" style={{ color: '#ED2738' }}>{n(turn.left?.ttft_ms)}ms</div>
                  <div className="metric-label" style={{ fontSize: '9px' }}>TTFT</div>
                </div>
                <div className="metric-card p-2" style={{ borderColor: 'rgba(237,39,56,0.2)', background: 'rgba(237,39,56,0.04)' }}>
                  <div className="font-mono text-sm font-bold" style={{ color: '#ED2738' }}>{turn.left?.tokens_sent ?? '—'}</div>
                  <div className="metric-label" style={{ fontSize: '9px' }}>TOKENS SENT</div>
                </div>
                <div className="metric-card p-2" style={{ borderColor: 'rgba(237,39,56,0.2)', background: 'rgba(237,39,56,0.04)' }}>
                  <div className="font-mono text-sm font-bold" style={{ color: '#ED2738' }}>${n(turn.left?.cost_usd, 4)}</div>
                  <div className="metric-label flex items-center justify-center gap-1" style={{ fontSize: '9px' }}>
                    <span>{pricingTier === 'self_hosted_h100' ? 'COMPUTE COST' : 'COST'}</span>
                    <CostInfoTooltip tier={pricingTier} isLeft={true} isHit={false} />
                  </div>
                </div>
              </div>
              {/* Token breakdown — what the GPU actually processed */}
              {totalTokens > 0 && (
                <div className="mt-2 rounded-lg px-2 py-1.5" style={{ background: 'rgba(237,39,56,0.04)', border: '1px solid rgba(237,39,56,0.12)' }}>
                  <div className="text-center mb-1" style={{ fontSize: '8px', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>What the GPU processed this turn</div>
                  <div className="flex items-center justify-center gap-1 flex-wrap" style={{ fontSize: '9px' }}>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(237,39,56,0.12)', color: '#ED2738', fontWeight: 600 }}>
                      Context: {savedTokens > 0 ? savedTokens.toLocaleString() : (totalTokens - newTokens > 0 ? (totalTokens - newTokens).toLocaleString() : '—')}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>+</span>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(237,39,56,0.06)', color: '#ED2738' }}>
                      New: {newTokens > 0 ? newTokens : turn.left?.tokens_sent ?? '—'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>=</span>
                    <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(237,39,56,0.15)', color: '#ED2738' }}>
                      {totalTokens.toLocaleString()} total
                    </span>
                  </div>
                  <div className="text-center mt-1" style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>GPU recomputed all {totalTokens.toLocaleString()} tokens — every session, every node</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — DDN Infinia */}
          <div className={isHit ? 'cache-hit-flash' : ''} style={{ background: 'var(--surface-card)' }}>
            <PanelHeader
              title="WITH DDN INFINIA"
              subtitle={isHit ? 'Persistent AI Memory · Zero GPU recompute' : isMiss ? 'Persistent AI Memory · Computing & caching' : 'Persistent AI Memory · Served from Infinia'}
              isCache={true} source={turn.right?.source} latency={turn.right?.infinia_latency_ms}
            />
            <div className="p-3">
              <div className="chat-bubble-ai text-xs leading-relaxed mb-3">{turn.response}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                  <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>{n(turn.right?.ttft_ms)}ms</div>
                  <div className="metric-label" style={{ fontSize: '9px' }}>TTFT</div>
                </div>
                <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                  <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>
                    {isHit ? `${turn.right?.tokens_sent ?? '—'} ✓` : (turn.right?.tokens_sent ?? '—')}
                  </div>
                  <div className="metric-label" style={{ fontSize: '9px' }}>TOKENS {isHit ? 'NEW ONLY' : 'SENT'}</div>
                </div>
                <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                  <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>
                    ${n(turn.right?.cost_usd, isHit ? 7 : 4)}
                  </div>
                  <div className="metric-label flex items-center justify-center gap-1" style={{ fontSize: '9px' }}>
                    <span>{pricingTier === 'self_hosted_h100' ? 'COMPUTE COST' : 'COST'}</span>
                    <CostInfoTooltip tier={pricingTier} isLeft={false} isHit={isHit} />
                  </div>
                </div>
              </div>
              {isMiss && (
                <div className="mt-2.5 p-2.5 rounded-lg border text-xs" style={{ background: 'rgba(26,129,175,0.06)', borderColor: 'rgba(26,129,175,0.25)' }}>
                  <div className="flex items-center justify-between gap-1.5 font-semibold mb-1" style={{ color: '#1A81AF' }}>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Stored in Infinia — ask again for cache hit:</span>
                    </div>
                    {(turn.right?.store_latency_ms ?? 0) > 0 && (
                      <span className="opacity-60 text-[10px] font-normal">({n(turn.right?.store_latency_ms)}ms write)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 mb-2">
                    Click any variation below to test with 0ms prefill:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {getQuestionVariations(turn.userMessage).map(v => (
                      <button
                        key={v}
                        onClick={() => onSelectQuestion?.(v)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all flex items-center hover:scale-105 active:scale-95 cursor-pointer"
                        style={{
                          background: 'rgba(0,194,128,0.12)',
                          borderColor: 'rgba(0,194,128,0.35)',
                          color: '#00875a',
                        }}
                        title={`Click to load "${v}" into input`}
                      >
                        <span>{v}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {turn.infinia_object && <InfiniaObjectCard obj={turn.infinia_object} />}
              {/* Infinia-side breakdown — mirrors left for instant visual contrast */}
              {totalTokens > 0 && (
                <div className="mt-2 rounded-lg px-2 py-1.5" style={{ background: 'rgba(0,194,128,0.04)', border: '1px solid rgba(0,194,128,0.15)' }}>
                  <div className="text-center mb-1" style={{ fontSize: '8px', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {isHit ? 'What Infinia handled this turn' : 'What was computed & stored'}
                  </div>
                  {isHit ? (
                    <div className="flex items-center justify-center gap-1 flex-wrap" style={{ fontSize: '9px' }}>
                      <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(0,194,128,0.15)', color: '#00C280' }}>
                        Infinia served: {savedTokens > 0 ? savedTokens.toLocaleString() : '—'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>·</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,194,128,0.08)', color: '#00C280' }}>
                        GPU saw: {newTokens > 0 ? newTokens : '—'} new only
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 flex-wrap" style={{ fontSize: '9px' }}>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(26,129,175,0.1)', color: '#1A81AF' }}>
                        Computed: {totalTokens.toLocaleString()} tokens
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>·</span>
                      <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(0,194,128,0.12)', color: '#00C280' }}>
                        ✓ Stored to Infinia
                      </span>
                    </div>
                  )}
                  <div className="text-center mt-1" style={{ fontSize: '8px', color: '#00C280' }}>
                    {isHit
                      ? `${savedTokens > 0 ? savedTokens.toLocaleString() : totalTokens.toLocaleString()} tokens never touched the GPU`
                      : 'Every future hit skips this compute entirely'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BUSINESS INSIGHTS BAR (cache hit only) ─────────────────────────── */}
        {isHit && (
          <div style={{ background: 'var(--surface-secondary)', borderTop: '1px solid var(--border-subtle)' }}>

            {/* ── COMPACT ROW — always visible ── */}
            <div className="px-4 py-2 flex items-center gap-3 flex-wrap">

              {/* Token ratio bar */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>GPU LOAD</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(237,39,56,0.12)', minWidth: '80px' }}
                  title={`${cachedPct}% of tokens bypassed GPU — only ${newTokens} new tokens processed`}>
                  {/* Cached portion — green */}
                  <div className="h-full transition-all duration-700 rounded-l-full"
                    style={{ width: `${cachedPct}%`, background: 'linear-gradient(90deg, #00C280, #00a86b)' }} />
                  {/* New tokens — red */}
                  <div className="h-full"
                    style={{ width: `${100 - cachedPct}%`, background: 'rgba(237,39,56,0.5)' }} />
                </div>
                <span className="text-xs font-bold whitespace-nowrap" style={{ color: '#00C280' }}>{cachedPct}% skipped</span>
              </div>

              {/* Key stat pills */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(0,194,128,0.1)', color: '#00C280', border: '1px solid rgba(0,194,128,0.2)' }}>
                  {savedTokens.toLocaleString()} tokens freed
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(0,194,128,0.1)', color: '#00C280', border: '1px solid rgba(0,194,128,0.2)' }}>
                  {n(turn.savings?.pct)}% cheaper
                </span>
                {/* Auto-callout: TTFT not the story */}
                {ttftNotStory && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.25)' }}
                    title="TTFT is similar here — token count and cost are the real savings story at scale">
                    <Info className="w-3 h-3" /> TTFT ≠ full story
                  </span>
                )}
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 transition-all hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                <TrendingUp className="w-3 h-3" />
                {expanded ? 'Hide' : 'Details'}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* ── EXPANDED DETAILS ── */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="px-4 pb-4 pt-1">

                    {/* ── Idea 2: Auto-callout explanation (full) ── */}
                    {ttftNotStory && (
                      <div className="md:col-span-2 rounded-xl p-3 flex items-start gap-3"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#D97706' }}>TTFT looks similar — but that's not the metric that matters here.</strong>
                          {' '}The GPU processed <strong>{newTokens.toLocaleString()} tokens</strong> on the right vs{' '}
                          <strong>{totalTokens.toLocaleString()} tokens</strong> on the left.
                          {' '}TTFT reflects output generation speed, which is identical either way.
                          {' '}The business value is in <strong>what the GPU never had to compute</strong>: {savedTokens.toLocaleString()} tokens = {n(turn.savings?.pct)}% of the GPU's input work — eliminated entirely.
                        </div>
                      </div>
                    )}

                    {/* ── Idea 6: Token Breakdown Table ── */}
                    <div className="rounded-xl p-3" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Database className="w-3.5 h-3.5" style={{ color: '#1A81AF' }} />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>What the GPU Actually Saw</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ color: 'var(--text-muted)' }}>
                            <th className="text-left pb-1.5 font-medium">Component</th>
                            <th className="text-right pb-1.5 font-medium" style={{ color: '#ED2738' }}>Without Infinia</th>
                            <th className="text-right pb-1.5 font-medium" style={{ color: '#00C280' }}>With Infinia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          <tr>
                            <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>System prompt + history</td>
                            <td className="text-right py-1.5 font-mono font-semibold" style={{ color: '#ED2738' }}>{savedTokens.toLocaleString()} tok</td>
                            <td className="text-right py-1.5 font-semibold" style={{ color: '#00C280' }}>⚡ 0 (skipped)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>New question</td>
                            <td className="text-right py-1.5 font-mono" style={{ color: 'var(--text-primary)' }}>{newTokens.toLocaleString()} tok</td>
                            <td className="text-right py-1.5 font-mono" style={{ color: 'var(--text-primary)' }}>{newTokens.toLocaleString()} tok</td>
                          </tr>
                          <tr className="font-semibold">
                            <td className="pt-2" style={{ color: 'var(--text-primary)' }}>GPU Input Total</td>
                            <td className="text-right pt-2 font-mono" style={{ color: '#ED2738' }}>{totalTokens.toLocaleString()} tok</td>
                            <td className="text-right pt-2 font-mono" style={{ color: '#00C280' }}>{newTokens.toLocaleString()} tok</td>
                          </tr>
                          <tr>
                            <td className="py-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Cost</td>
                            <td className="text-right py-1 font-mono" style={{ color: '#ED2738', fontSize: '10px' }}>${n(turn.left?.cost_usd, 5)}</td>
                            <td className="text-right py-1 font-mono" style={{ color: '#00C280', fontSize: '10px' }}>${n(turn.right?.cost_usd, 7)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </motion.div>
    </TurnErrorBoundary>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ChatObservatory({ onNavigateToRoi, onNavigateToDecision }: { onNavigateToRoi?: () => void; onNavigateToDecision?: () => void } = {}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState<'business' | 'technical'>('business')
  const [pricingTier, setPricingTier] = useState<PricingTier>('self_hosted_h100')
  const [showCostMath, setShowCostMath] = useState(false)
  const [sessionId, setSessionId] = useState(() => `sess_${Date.now()}`)
  const [cumulativeSavings, setCumulativeSavings] = useState(0)
  const [totalHits, setTotalHits] = useState(0)
  const [gpuFlushed, setGpuFlushed] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [persistedTurns, setPersistedTurns] = useState(0)
  const [resumeLatency, setResumeLatency] = useState<number | null>(null)
  const [gpuDirectData, setGpuDirectData] = useState<{
    cpuMetrics: Record<string, unknown> | null
    reference: Record<string, unknown> | null
    showDiagram: boolean
  }>({ cpuMetrics: null, reference: null, showDiagram: false })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 350)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSelectSuggestion = (q: string) => {
    setInput(q)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Cached question analysis for smart typo-proof suggestions
  const allDistinctCachedQuestions = Array.from(new Set(turns.map(t => t.userMessage)))
  const latestQuestion = turns.length > 0 ? turns[turns.length - 1].userMessage : null
  const latestVariations = latestQuestion ? getQuestionVariations(latestQuestion) : []
  const allCachedVariations = Array.from(new Set(allDistinctCachedQuestions.flatMap(q => getQuestionVariations(q))))
  
  const matchingVariations = input.trim().length > 0
    ? allCachedVariations.filter(v => 
        v.toLowerCase().includes(input.trim().toLowerCase()) && v.toLowerCase() !== input.trim().toLowerCase()
      )
    : []

  const inputIsCacheHitCandidate = Boolean(
    input.trim().length > 0 &&
    allCachedVariations.some(v => v.toLowerCase() === input.trim().toLowerCase())
  )

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setLoading(true)

    try {
      const result: ChatResponse = await kvApi.sendChat({
        session_id: sessionId,
        message: msg,
        demo_mode: demoMode,
        pricing_tier: pricingTier,
      })
      const turn: Turn = {
        id: `t${Date.now()}`, userMessage: msg, response: result.response,
        timestamp: Date.now(), cacheHit: result.cache_hit,
        normalizedQuery: (result as any).normalized_query,
        left: result.left, right: result.right, savings: result.savings,
        pricing: result.pricing,
        infinia_object: (result as any).infinia_object,
      }
      setTurns(prev => [...prev, turn])
      if (result.cache_hit) {
        setCumulativeSavings(p => p + (result.savings?.cost_usd || 0))
        setTotalHits(p => p + 1)
        toast.success(
          `INFINIA HIT — ${result.savings?.speedup_x ?? '?'}x faster · ${n(result.savings?.pct)}% cheaper`,
          { duration: 4000 }
        )
      } else {
        toast('◯ Cache MISS — stored in Infinia. Ask again to see the hit!', { duration: 3000, icon: '💾' })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Request failed — is Ollama running?')
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, demoMode, pricingTier])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearSession = async () => {
    await kvApi.clearSession(sessionId).catch(() => {})
    setTurns([]); setCumulativeSavings(0); setTotalHits(0)
    setGpuFlushed(false); setPersistedTurns(0); setResumeLatency(null)
    toast.success('Session cleared')
  }

  // GPU Memory Flush — persists to Infinia FIRST, then wipes UI
  const flushGpuMemory = async () => {
    if (turns.length === 0) {
      toast.error('No conversation to flush — ask a few questions first')
      return
    }
    try {
      // Step 1: persist current conversation to Infinia (captures CPU metrics)
      const res = await kvApi.persistSession(sessionId)
      setPersistedTurns(res.turns_persisted || turns.length)
      // Step 2: fetch GPU Direct reference numbers in parallel
      const ref = await kvApi.getGpuDirectReference().catch(() => null)
      setGpuDirectData({
        cpuMetrics: res.cpu_metrics ?? null,
        reference:  ref ?? null,
        showDiagram: false,
      })
      // Step 3: wipe local session memory (GPU forgot you)
      await kvApi.clearSession(sessionId).catch(() => {})
      setTurns([]); setCumulativeSavings(0); setTotalHits(0); setResumeLatency(null)
      setGpuFlushed(true)
      toast.success(`💾 ${res.turns_persisted} turns written to Infinia in ${res.store_latency_ms}ms`, { duration: 5000 })
    } catch {
      toast.error('Could not persist to Infinia — check connection')
    }
  }

  // Restore from Infinia — reload the conversation after GPU flush
  const restoreFromInfinia = async () => {
    setRestoring(true)
    try {
      const res = await kvApi.getSessionHistory(sessionId)
      if (res.found && res.turns?.length > 0) {
        const restoredTurns: Turn[] = res.turns.map((t: any, i: number) => ({
          id: `restored_${i}`,
          userMessage: t.user,
          response: t.assistant,
          timestamp: Date.now() - (res.turns.length - i) * 1000,
          cacheHit: true,
          left: { ttft_ms: 0, total_ms: 0, tokens_sent: 0, cost_usd: 0, source: 'RESTORED', response_tokens: 0 },
          right: { ttft_ms: res.infinia_latency_ms || res.latency_ms, total_ms: res.latency_ms, tokens_sent: 0, cost_usd: 0, source: 'INFINIA_CACHE', infinia_latency_ms: res.infinia_latency_ms || res.latency_ms, response_tokens: 0 },
        }))
        setTurns(restoredTurns)
        setResumeLatency(res.latency_ms)
        setGpuFlushed(false)
        toast.success(`⚡ Restored ${res.turn_count} turns from Infinia in ${res.latency_ms}ms`, { duration: 5000, icon: '🗄️' })
      } else {
        toast.error('No session found in Infinia — flush the session first')
      }
    } catch {
      toast.error('Restore failed — check Infinia connection')
    } finally {
      setRestoring(false)
    }
  }

  // New Session — wipes context entirely so generic questions start clean
  const newSession = async () => {
    try {
      await kvApi.clearSession(sessionId).catch(() => {})
    } finally {
      setSessionId(`sess_${Date.now()}`)
      setTurns([])
      setCumulativeSavings(0)
      setTotalHits(0)
      setGpuFlushed(false)
      setPersistedTurns(0)
      setResumeLatency(null)
      setGpuDirectData({ cpuMetrics: null, reference: null, showDiagram: false })
      toast.success('New session started — clean context, no KV carry-over', { icon: '🆕', duration: 3000 })
    }
  }

  const purgeDemo = async () => {
    const confirmed = window.confirm(
      'Reset Demo Cache?\n\nThis will DELETE all cached objects from DDN Infinia.\nThe next question will be a genuine MISS (stored fresh).\n\nThis is useful to demonstrate the MISS → STORE → HIT flow from scratch.'
    )
    if (!confirmed) return
    try {
      const res = await kvApi.purgeInfiniaCache()
      setTurns([]); setCumulativeSavings(0); setTotalHits(0)
      toast.success(`🗑️ ${res.message}`, { duration: 5000 })
    } catch (e: any) {
      toast.error('Purge failed: ' + (e?.response?.data?.detail || e?.message || 'Unknown error'))
    }
  }

  const hitRate = turns.length > 0 ? Math.round((totalHits / turns.length) * 100) : 0
  const totalTokensSaved = turns.reduce((a, t) => a + (t.savings?.tokens_saved || 0), 0)

  // ── Question bank — 15 questions, 5 shown at a time (shuffled) ────────────
  const ALL_DEMO_QUESTIONS = [
    'What is DDN Infinia?',
    'Explain KV cache in LLMs',
    'How does Infinia compare to storing KV cache in RAM?',
    'What is the cost benefit of prefix caching?',
    'Summarize the key benefits for enterprise AI',
    'How does GPU memory eviction affect AI inference?',
    'What happens when KV cache is stored on NVMe vs object storage?',
    'Explain the difference between prefill and decode in LLM inference',
    'Why does token count matter for GPU compute cost?',
    'How does DDN Infinia handle concurrent AI sessions?',
    'What is time-to-first-token and why does it matter?',
    'How does prefix caching reduce inference cost at scale?',
    'What is the latency overhead of retrieving KV cache from Infinia?',
    'How does caching help with multi-tenant AI deployments?',
    'What makes DDN Infinia better than Redis for KV cache storage?',
  ]

  const shuffle = (arr: string[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const [shuffledQuestions, setShuffledQuestions] = useState<string[]>(() => shuffle(ALL_DEMO_QUESTIONS).slice(0, 5))

  const reshuffleQuestions = () => setShuffledQuestions(shuffle(ALL_DEMO_QUESTIONS).slice(0, 5))

  return (
    <div className="space-y-6">
      {/* vLLM resource conflict warning — auto-detects if vLLM is running */}
      <VllmResourceGuard pageName="Chat Observatory" vllmMemoryGb={14} />

      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Live Chat Observatory</h2>
            <p className="section-description">Same GPU. Same model. One remembers, one recomputes. Watch the difference in real time.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Pricing Tier Selector */}
            <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-secondary)' }}>
              {(Object.keys(PRICING_TIERS) as PricingTier[]).map(tier => (
                <button
                  key={tier}
                  onClick={() => setPricingTier(tier)}
                  title={PRICING_TIERS[tier].label}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                  style={pricingTier === tier ? {
                    background: PRICING_TIERS[tier].color,
                    color: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                  } : {
                    color: 'var(--text-muted)',
                    background: 'transparent'
                  }}
                >
                  {PRICING_TIERS[tier].short}
                </button>
              ))}
            </div>

            {/* Tech/Business toggle */}
            <button
              onClick={() => setDemoMode(m => m === 'business' ? 'technical' : 'business')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
            >
              {demoMode === 'business' ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5 text-[#1A81AF]" />}
              {demoMode === 'business' ? 'Business' : 'Technical'} Mode
            </button>
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80 whitespace-nowrap"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear UI
            </button>

            {/* New Session button */}
            <button
              onClick={newSession}
              title="Clear all session context — next question starts with a clean slate (no KV carry-over)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 whitespace-nowrap"
              style={{ borderColor: 'rgba(26,129,175,0.45)', color: '#1A81AF', background: 'rgba(26,129,175,0.07)' }}
            >
              <span className="text-xs">🆕</span> New Session
            </button>
            {/* GPU Memory Flush button */}
            <button
              onClick={flushGpuMemory}
              disabled={turns.length === 0}
              title="Persist conversation to Infinia then clear GPU memory — demonstrates session eviction"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ borderColor: 'rgba(237,140,0,0.5)', color: '#D97706', background: 'rgba(237,140,0,0.07)' }}
            >
              <span className="text-xs">🔴</span> GPU Memory Flushed
            </button>

            {/* Restore from Infinia button — only visible after flush */}
            {gpuFlushed && (
              <button
                onClick={restoreFromInfinia}
                disabled={restoring}
                title="Reload conversation from DDN Infinia object store"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
                style={{ borderColor: 'rgba(0,194,128,0.5)', color: '#00C280', background: 'rgba(0,194,128,0.08)' }}
              >
                {restoring
                  ? <><div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> Restoring…</>
                  : <><span className="text-xs">⚡</span> Restore from Infinia</>}
              </button>
            )}

            <button
              onClick={purgeDemo}
              title="Delete all cached objects from DDN Infinia — next question will be a genuine MISS"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 whitespace-nowrap"
              style={{ borderColor: 'rgba(237,39,56,0.4)', color: '#ED2738', background: 'rgba(237,39,56,0.06)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
            </button>
          </div>
        </div>

        {/* Valuation Archetype & Economics Pill */}
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {/* Main pill row */}
          <div className="flex items-center gap-2 text-xs px-3 py-2" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PRICING_TIERS[pricingTier].color }} />
            <span className="flex-1">
              <strong style={{ color: PRICING_TIERS[pricingTier].color }}>{PRICING_TIERS[pricingTier].label}</strong>
              {pricingTier === 'self_hosted_h100' && (
                <>{' '}— GPU compute rate: <strong>$0.70/1M</strong> input · <strong>$2.80/1M</strong> output. {PRICING_TIERS[pricingTier].note}</>
              )}
              {pricingTier === 'ncp_provider' && (
                <>{' '}— AI Cloud COGS rate: <strong>$0.60/1M</strong> input · <strong>$2.40/1M</strong> output. {PRICING_TIERS[pricingTier].note}</>
              )}
              {pricingTier === 'cloud_api' && (
                <>{' '}— Commercial token API baseline: <strong>$2.50/1M</strong> input · <strong>$10.00/1M</strong> output. {PRICING_TIERS[pricingTier].note}</>
              )}
            </span>
            <button
              onClick={() => setShowCostMath(m => !m)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono transition-all cursor-pointer"
              style={{
                background: showCostMath ? `${PRICING_TIERS[pricingTier].color}26` : `${PRICING_TIERS[pricingTier].color}12`,
                color: PRICING_TIERS[pricingTier].color,
                border: `1px solid ${PRICING_TIERS[pricingTier].color}40`,
              }}
              title="Show economic rationale and calculation math"
            >
              {showCostMath ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showCostMath ? 'Hide math' : 'How?'}
            </button>
          </div>

          {/* Cost Origin & Deployment Model Disclaimer */}
          <div className="px-3 py-1.5 flex items-center justify-between border-t text-[11px] leading-snug" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase inline-flex items-center gap-1" style={{ background: `${PRICING_TIERS[pricingTier].color}15`, color: PRICING_TIERS[pricingTier].color, border: `1px solid ${PRICING_TIERS[pricingTier].color}30` }}>
                <span>💡</span>
                <span>{pricingTier === 'self_hosted_h100' ? 'Self-Hosted Model' : pricingTier === 'ncp_provider' ? 'Neocloud Model' : 'Cloud API Benchmark'}</span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {pricingTier === 'self_hosted_h100' && (
                  <>
                    <strong style={{ color: 'var(--text-primary)' }}>Cost Origin:</strong> Not an external token invoice. Reflects <strong>amortized GPU hardware & power (~$3/GPU-hr, ~700W)</strong>. Cached tokens skip GPU prefill entirely, freeing physical cluster capacity to serve <strong>3–5× more concurrent users</strong> without buying extra GPUs.
                  </>
                )}
                {pricingTier === 'ncp_provider' && (
                  <>
                    <strong style={{ color: 'var(--text-primary)' }}>Cost Origin:</strong> Direct AI Cloud infrastructure COGS per stream. Zero prefill on cached prefixes expands tenant density and boosts gross margins from <strong>45% to 87%</strong>.
                  </>
                )}
                {pricingTier === 'cloud_api' && (
                  <>
                    <strong style={{ color: 'var(--text-primary)' }}>Cost Origin:</strong> Commercial model API billing equivalent ($2.50/1M input). Infinia provides <strong>100% free</strong> prefix retrieval vs paying commercial API fees.
                  </>
                )}
              </span>
            </div>
            {onNavigateToDecision && (
              <button
                onClick={onNavigateToDecision}
                className="font-bold text-[10.5px] hover:underline cursor-pointer flex items-center gap-1 whitespace-nowrap ml-3"
                style={{ color: PRICING_TIERS[pricingTier].color }}
                title="Open the When to Cache? decision calculator"
              >
                <span>When to Cache? Model →</span>
              </button>
            )}
          </div>

          {/* Expandable math breakdown — tailored for each archetype */}
          <AnimatePresence>
            {showCostMath && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 py-3 font-mono text-xs space-y-2"
                  style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>

                  {pricingTier === 'self_hosted_h100' && (
                    <>
                      <div className="text-xs font-semibold mb-2 font-sans" style={{ color: '#76B900', letterSpacing: '0.05em' }}>
                        HOW THESE RATES ARE DERIVED — DEDICATED GPU HARDWARE COMPUTE AMORTIZATION
                      </div>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-1 mb-3">
                        {[
                          ['H100/H200 market rate', '~$3.00 / hr', 'cloud spot or on-prem amortized DGX'],
                          ['Input processing', '~1,500 tokens/s', 'Llama 3.x prefill on single GPU'],
                          ['Output generation', '~400 tokens/s', 'autoregressive decode — slower'],
                        ].map(([k, v, sub]) => (
                          <div key={k}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{k}</div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded p-2" style={{ background: 'rgba(118,185,0,0.07)', border: '1px solid rgba(118,185,0,0.2)' }}>
                          <div style={{ color: '#76B900', fontWeight: 700, marginBottom: '4px' }}>INPUT PREFILL COMPUTE</div>
                          <div style={{ color: 'var(--text-secondary)' }}>1M tokens ÷ 1,500 tok/s = 667s = 0.185 GPU-hours</div>
                          <div style={{ color: 'var(--text-secondary)' }}>0.185 × $3.00 = $0.56 ≈ <strong style={{ color: '#76B900' }}>$0.70 / 1M</strong> <span style={{ color: 'var(--text-muted)' }}>(+cooling & margin)</span></div>
                        </div>
                        <div className="rounded p-2" style={{ background: 'rgba(118,185,0,0.07)', border: '1px solid rgba(118,185,0,0.2)' }}>
                          <div style={{ color: '#76B900', fontWeight: 700, marginBottom: '4px' }}>OUTPUT DECODE COMPUTE</div>
                          <div style={{ color: 'var(--text-secondary)' }}>1M tokens ÷ 400 tok/s = 2,500s = 0.69 GPU-hours</div>
                          <div style={{ color: 'var(--text-secondary)' }}>0.69 × $3.00 = $2.08 ≈ <strong style={{ color: '#76B900' }}>$2.80 / 1M</strong> <span style={{ color: 'var(--text-muted)' }}>(+cooling & margin)</span></div>
                        </div>
                      </div>
                      <div className="text-xs font-sans pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid rgba(118,185,0,0.15)', paddingTop: '6px' }}>
                        ✅ With DDN Infinia KV cache, cached input tokens bypass GPU prefill entirely — <strong style={{ color: '#76B900' }}>zero GPU time, zero compute cost</strong>. You only pay compute for new question tokens.
                      </div>
                      <div className="rounded p-2 text-xs font-sans flex items-start gap-2 mt-2" style={{ background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.2)' }}>
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#76B900' }} />
                        <div>
                          <strong style={{ color: '#76B900' }}>Audience FAQ: &ldquo;We already own self-hosted GPUs — why show a cost?&rdquo;</strong>
                          <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Self-hosted clusters don't pay per-token software bills, but GPUs and datacenter power are finite and expensive (~$3/GPU-hr amortized, ~700W/H100). When prompt prefill is bypassed by DDN Infinia, physical GPU compute cycles and VRAM are preserved — allowing your existing cluster to handle <strong>3–5× more concurrent users</strong> without procuring additional GPU servers.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {pricingTier === 'ncp_provider' && (
                    <>
                      <div className="text-xs font-semibold mb-2 font-sans" style={{ color: '#00C280', letterSpacing: '0.05em' }}>
                        HOW THESE RATES ARE DERIVED — NEOCLOUD (NCP) INFERENCE MARGIN EXPANSION
                      </div>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-1 mb-3">
                        {[
                          ['Baseline market price', '$0.60 / 1M tokens', 'Competitive GPUaaS market rate'],
                          ['Uncached gross margin', '~45%', 'High GPU prefill consumption limits tenant density'],
                          ['Infinia cached margin', '~87%', 'Prefill offloaded to Infinia storage layer'],
                        ].map(([k, v, sub]) => (
                          <div key={k}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{k}</div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded p-2" style={{ background: 'rgba(0,194,128,0.07)', border: '1px solid rgba(0,194,128,0.2)' }}>
                        <div style={{ color: '#00C280', fontWeight: 700, marginBottom: '4px' }}>CONCURRENCY & REVENUE MULTIPLIER</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Without Infinia, multi-tenant conversational & agentic workloads saturate GPU HBM, triggering costly recomputes.</div>
                        <div style={{ color: 'var(--text-secondary)' }}>With Infinia, KV cache is served over sub-15ms fabric. Each DGX server serves up to <strong style={{ color: '#00C280' }}>2.4× more concurrent streams</strong> at pure margin.</div>
                      </div>
                      <div className="text-xs font-sans pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid rgba(0,194,128,0.15)', paddingTop: '6px' }}>
                        ✅ Neocloud providers turn raw GPU CapEx into scalable recurring gross margin without expanding physical data center footprint.
                      </div>
                    </>
                  )}

                  {pricingTier === 'cloud_api' && (
                    <>
                      <div className="text-xs font-semibold mb-2 font-sans" style={{ color: '#1A81AF', letterSpacing: '0.05em' }}>
                        HOW THESE RATES ARE DERIVED — BUILD VS. BUY COMMERCIAL API REPLACEMENT
                      </div>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-1 mb-3">
                        {[
                          ['Commercial API baseline', '$2.50 / 1M input', 'GPT-4o / Claude 3.5 Sonnet class baseline'],
                          ['Commercial cache discount', 'Max 50% discount', 'Proprietary APIs still charge $1.25/1M for cached tokens'],
                          ['Infinia self-hosted cost', '$0.00 / 1M cached', '100% free prefix retrieval from on-prem DDN storage'],
                        ].map(([k, v, sub]) => (
                          <div key={k}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{k}</div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded p-2" style={{ background: 'rgba(26,129,175,0.07)', border: '1px solid rgba(26,129,175,0.2)' }}>
                        <div style={{ color: '#1A81AF', fontWeight: 700, marginBottom: '4px' }}>ENTERPRISE INVOICE ELIMINATION</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Processing a 50,000-token system context across 50,000 requests/day costs <strong style={{ color: '#ED2738' }}>$3,750/day ($112,500/mo)</strong> on commercial APIs.</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Moving the workload to self-hosted open models (Llama 3.3 70B / Nemotron) with DDN Infinia eliminates this recurring invoice completely.</div>
                      </div>
                      <div className="text-xs font-sans pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid rgba(26,129,175,0.15)', paddingTop: '6px' }}>
                        ✅ High-volume enterprise context workloads achieve ROI on dedicated NVIDIA + DDN infrastructure in under 4 months.
                      </div>
                    </>
                  )}

                  {/* Bridge link to ROI Calculator */}
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg mt-2 font-sans"
                    style={{ background: 'rgba(26,129,175,0.08)', border: '1px solid rgba(26,129,175,0.25)' }}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#1A81AF] flex-shrink-0" />
                      <span style={{ color: 'var(--text-primary)' }}>
                        Want to simulate these savings at enterprise scale (50K to 50M requests/day)?
                      </span>
                    </div>
                    {onNavigateToRoi ? (
                      <button
                        onClick={onNavigateToRoi}
                        className="font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                        style={{ color: '#1A81AF' }}
                      >
                        Open Enterprise ROI Calculator →
                      </button>
                    ) : (
                      <a
                        href="#calculator"
                        onClick={(e) => {
                          e.preventDefault()
                          window.dispatchEvent(new CustomEvent('nav-tab', { detail: 'roi' }))
                        }}
                        className="font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                        style={{ color: '#1A81AF' }}
                      >
                        Open Enterprise ROI Calculator →
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label={pricingTier === 'self_hosted_h100' ? "Amortized Savings" : "Session Savings"}
          value={`$${n(cumulativeSavings, 4)}`}
          highlight="green"
          icon={DollarSign}
          subtext={pricingTier === 'self_hosted_h100' ? "Amortized compute freed" : pricingTier === 'ncp_provider' ? "Inference COGS preserved" : "API billing eliminated"}
        />
        <MetricCard label="Cache Hit Rate"    value={`${hitRate}%`}                 highlight={hitRate > 0 ? 'green' : undefined} icon={Zap} />
        <MetricCard label="Tokens Saved"      value={totalTokensSaved.toLocaleString()} icon={Hash} />
        <MetricCard label="Conversation Turns" value={turns.length}                 icon={Database} />
      </div>

      {/* Panel Column Headers */}
      <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border-subtle)' }}>
        <div className="p-3 text-center font-semibold text-sm" style={{ background: 'rgba(237,39,56,0.04)', color: '#ED2738' }}>
          🖥️ GPU HBM ONLY<br /><span className="text-xs font-normal text-neutral-500">No persistent cache · Full recompute on every session</span>
        </div>
        <div className="p-3 text-center font-semibold text-sm" style={{ background: 'rgba(0,194,128,0.04)', color: '#00C280' }}>
          ✅ WITH DDN INFINIA<br /><span className="text-xs font-normal text-neutral-500">Persistent AI Memory · Zero GPU recompute</span>
        </div>
      </div>

      {/* GPU Memory Flushed Banner */}
      {gpuFlushed && (
        <div className="rounded-xl p-4 flex items-start gap-4" style={{ background: 'rgba(217,119,6,0.07)', border: '2px solid rgba(217,119,6,0.35)' }}>
          <div className="text-3xl flex-shrink-0">🔴</div>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1" style={{ color: '#D97706' }}>GPU HBM Cleared — Session Evicted from Memory</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The GPU has been serving other users. Your {persistedTurns}-turn conversation was evicted from GPU memory
              to make room. <strong style={{ color: '#D97706' }}>Without Infinia</strong>, this context is gone — you'd have to start over.
              <br />
              <strong style={{ color: '#00C280' }}>With DDN Infinia</strong>, your full conversation state was persisted to the object store.
              Click <strong>⚡ Restore from Infinia</strong> to reload it.
            </div>
          </div>
          <button
            onClick={restoreFromInfinia}
            disabled={restoring}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#00C280', color: '#fff' }}
          >
            {restoring ? 'Restoring…' : '⚡ Restore from Infinia'}
          </button>
        </div>
      )}

      {/* GPU Direct Impact Panel — shown after flush */}
      {gpuFlushed && gpuDirectData.cpuMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-default)', background: 'var(--surface-card)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(0,194,128,0.08), rgba(26,129,175,0.06))', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: '#00C280' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>GPU Direct / RDMA — What This Transfer Reveals</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,128,0.1)', color: '#00C280', border: '1px solid rgba(0,194,128,0.2)' }}>Hybrid View: Live + Reference</span>
          </div>

          <div className="p-4 space-y-4">
            {/* Side-by-side comparison table */}
            <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
              {/* Left — live CPU path */}
              <div className="p-3" style={{ background: 'var(--surface-secondary)' }}>
                <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#ED2738' }}>
                  <span>⚠️</span> Current Session — CPU-Mediated Path
                  <span className="ml-auto text-xs font-normal opacity-60">Measured live</span>
                </div>
                <div className="space-y-2">
                  {[[
                    'Data Path', (gpuDirectData.cpuMetrics as any)?.path ?? 'GPU → CPU DRAM → NIC → Infinia'
                  ], [
                    'CPU Spike', `${(gpuDirectData.cpuMetrics as any)?.cpu_peak_pct ?? '—'}%`
                  ], [
                    'DRAM Used', `${(((gpuDirectData.cpuMetrics as any)?.dram_used_mb ?? 0) / 1024).toFixed(1)} GB`
                  ], [
                    'Transfer Time', `${(gpuDirectData.cpuMetrics as any)?.transfer_latency_ms ?? '—'}ms`
                  ], [
                    'CPU Hops', (gpuDirectData.cpuMetrics as any)?.hops ?? 3
                  ]].map(([label, val]) => (
                    <div key={label as string} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span className="font-semibold" style={{ color: '#ED2738' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — GPU Direct reference */}
              <div className="p-3" style={{ background: 'var(--surface-secondary)' }}>
                <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#00C280' }}>
                  <span>⚡</span> With Infinia GPU Direct
                  <span className="ml-auto text-xs font-normal opacity-60">Reference</span>
                </div>
                <div className="space-y-2">
                  {[[
                    'Data Path', 'GPU HBM → RDMA NIC → Infinia'
                  ], [
                    'CPU Spike', `~${(gpuDirectData.reference as any)?.gpu_direct?.cpu_involvement_pct ?? 0}%`
                  ], [
                    'DRAM Used', '0 GB (bypassed)'
                  ], [
                    'Transfer Time', `~${(gpuDirectData.reference as any)?.gpu_direct?.latency_ms ?? 12}ms`
                  ], [
                    'CPU Hops', `${(gpuDirectData.reference as any)?.gpu_direct?.hops ?? 1} (RDMA direct)`
                  ]].map(([label, val]) => (
                    <div key={label as string} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span className="font-semibold" style={{ color: '#00C280' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(0,194,128,0.05)', border: '1px solid rgba(0,194,128,0.15)' }}>
              <strong style={{ color: '#00C280' }}>⚡ What GPU Direct eliminates:</strong>
              {' '}The CPU spike, DRAM staging, and 3-hop network path you just saw — all gone.
              {' '}KV cache moves GPU ↔ Infinia at {(gpuDirectData.reference as any)?.gpu_direct?.bandwidth_gbps ?? 200} GB/s via RDMA,
              {' '}freeing CPU DRAM entirely for other inference workloads.
            </div>

            {/* Concurrent session multiplier */}
            {(gpuDirectData.cpuMetrics as any)?.dram_used_mb > 0 && (
              <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(26,129,175,0.05)', border: '1px solid rgba(26,129,175,0.15)' }}>
                <div className="font-semibold mb-2" style={{ color: '#1A81AF' }}>📊 What Freed CPU DRAM Enables</div>
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const dramFreedGb = (gpuDirectData.cpuMetrics as any).dram_used_mb / 1024
                    const sessPerGb = 2 // ~2 concurrent LLM sessions per GB DRAM freed
                    return [
                      { label: 'This flush',    sessions: Math.round(dramFreedGb * sessPerGb),              dram: `${dramFreedGb.toFixed(1)} GB` },
                      { label: 'Full node\n(64 GB)', sessions: Math.round(64 * sessPerGb),                  dram: '64 GB' },
                      { label: '100 nodes',    sessions: (Math.round(64 * sessPerGb) * 100).toLocaleString(), dram: '6.4 TB' },
                    ].map(row => (
                      <div key={row.label} className="text-center p-2 rounded-lg" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
                        <div className="font-bold text-sm" style={{ color: '#1A81AF' }}>+{row.sessions}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>concurrent sessions</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{row.label.replace('\n', ' ')}</div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}

            {/* Memory Hierarchy Diagram — on click */}
            <div>
              <button
                onClick={() => setGpuDirectData(d => ({ ...d, showDiagram: !d.showDiagram }))}
                className="text-xs font-semibold flex items-center gap-1.5 mb-3 transition-all hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                <Zap className="w-3 h-3" />
                {gpuDirectData.showDiagram ? 'Hide' : 'Show'} Memory Hierarchy Diagram
                {gpuDirectData.showDiagram ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {gpuDirectData.showDiagram && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="rounded-xl p-4" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-semibold text-center mb-4" style={{ color: 'var(--text-muted)' }}>G1 = GPU HBM · G2 = CPU DRAM · G4 = DDN Infinia</p>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Traditional path */}
                        <div>
                          <p className="text-xs font-bold text-center mb-3" style={{ color: '#ED2738' }}>Traditional (CPU-Mediated)</p>
                          <div className="flex flex-col items-center gap-1">
                            <div className="px-4 py-2 rounded-lg text-xs font-bold text-center w-full" style={{ background: 'rgba(237,39,56,0.1)', border: '2px solid rgba(237,39,56,0.4)', color: '#ED2738' }}>G1 — GPU HBM<br/><span className="font-normal text-xs opacity-70">Active KV cache</span></div>
                            <div className="text-center text-xs" style={{ color: '#ED2738' }}>↓ PCIe<br/><span className="opacity-60" style={{ fontSize: '10px' }}>Bottleneck</span></div>
                            <div className="px-4 py-2 rounded-lg text-xs font-bold text-center w-full" style={{ background: 'rgba(237,39,56,0.08)', border: '2px solid rgba(237,39,56,0.3)', color: '#ED2738' }}>G2 — CPU DRAM<br/><span className="font-normal text-xs opacity-70">Staging area (wasted)</span></div>
                            <div className="text-center text-xs" style={{ color: '#ED2738' }}>↓ NIC<br/><span className="opacity-60" style={{ fontSize: '10px' }}>CPU interrupt</span></div>
                            <div className="px-4 py-2 rounded-lg text-xs font-bold text-center w-full" style={{ background: 'rgba(237,39,56,0.06)', border: '1px solid rgba(237,39,56,0.25)', color: '#ED2738' }}>G4 — Infinia</div>
                            <div className="text-xs mt-1 text-center" style={{ color: '#ED2738', fontSize: '10px' }}>3 hops · CPU fully involved</div>
                          </div>
                        </div>

                        {/* GPU Direct path */}
                        <div>
                          <p className="text-xs font-bold text-center mb-3" style={{ color: '#00C280' }}>GPU Direct / RDMA</p>
                          <div className="flex flex-col items-center gap-1">
                            <div className="px-4 py-2 rounded-lg text-xs font-bold text-center w-full" style={{ background: 'rgba(0,194,128,0.1)', border: '2px solid rgba(0,194,128,0.4)', color: '#00C280' }}>G1 — GPU HBM<br/><span className="font-normal text-xs opacity-70">Active KV cache</span></div>
                            <div className="text-center text-xs" style={{ color: '#00C280' }}>↓ RDMA (direct)<br/><span className="opacity-60" style={{ fontSize: '10px' }}>{(gpuDirectData.reference as any)?.gpu_direct?.bandwidth_gbps ?? 200} GB/s</span></div>
                            <div className="px-4 py-2 rounded-lg text-xs font-bold text-center w-full opacity-30" style={{ background: 'var(--surface-card)', border: '2px dashed var(--border-subtle)', color: 'var(--text-muted)' }}>G2 — CPU DRAM<br/><span className="font-normal text-xs">100% free for other work</span></div>
                            <div className="px-4 py-2 rounded-lg text-xs font-bold text-center w-full" style={{ background: 'rgba(0,194,128,0.08)', border: '2px solid rgba(0,194,128,0.3)', color: '#00C280' }}>G4 — Infinia</div>
                            <div className="text-xs mt-1 text-center" style={{ color: '#00C280', fontSize: '10px' }}>1 hop · CPU never touched</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Source attribution */}
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold">Live metrics:</span> psutil · measured this session  | 
              <span className="font-semibold">Reference:</span>{' '}
              {(gpuDirectData.reference as any)?.gpu_direct?.source ?? 'DDN Infinia GPU Direct benchmark'}
              {(gpuDirectData.reference as any)?.gpu_direct?.source_url && (
                <a href={(gpuDirectData.reference as any).gpu_direct.source_url} target="_blank" rel="noreferrer"
                  className="ml-1 underline hover:opacity-80" style={{ color: '#1A81AF' }}>↗ source
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Session Resume Success Banner */}
      {resumeLatency !== null && !gpuFlushed && turns.length > 0 && (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(0,194,128,0.07)', border: '1px solid rgba(0,194,128,0.3)' }}>
          <Zap className="w-4 h-4 text-[#00C280] shrink-0" />
          <div className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#00C280' }}>Session restored from DDN Infinia in {resumeLatency}ms</strong> — {turns.length} conversation turns reloaded.
            GPU re-processing skipped entirely. Continue the conversation below.
          </div>
          <button onClick={() => setResumeLatency(null)} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      )}

      {/* Chat turns */}
      <div className="card overflow-hidden">
        {turns.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="font-semibold text-neutral-700">Ask a question to start the demo</div>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              First question → MISS (stored in Infinia). Ask <strong>same question again</strong> → HIT (instantly retrieved). The Infinia Object Inspector shows exactly what was stored.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {shuffledQuestions.map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-full text-xs border font-medium transition-all hover:border-ddn-red hover:text-ddn-red"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={reshuffleQuestions}
              className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(237,39,56,0.07)', color: '#ED2738', border: '1px solid rgba(237,39,56,0.25)' }}
            >
              <RotateCcw className="w-3 h-3" /> Shuffle questions
            </button>
          </div>
        ) : (
          turns.map((turn, i) => <TurnRow key={turn.id} turn={turn} idx={i} onSelectQuestion={handleSelectSuggestion} pricingTier={pricingTier} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card p-4 space-y-3">
        {/* Guaranteed Cache Hit Options Panel — shown whenever turns exist */}
        {turns.length > 0 && latestQuestion && (
          <div className="p-3 rounded-xl border"
            style={{
              background: 'rgba(0,194,128,0.05)',
              borderColor: 'rgba(0,194,128,0.25)',
            }}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="text-xs font-bold" style={{ color: '#00C280' }}>
                <span>Test Cache Hit:</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Click any option below to test with 0ms prefill
              </span>
            </div>

            {/* Quick variation chips for the latest question */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {latestVariations.map(v => {
                const isSelected = input.trim().toLowerCase() === v.trim().toLowerCase()
                return (
                  <button
                    key={v}
                    onClick={() => handleSelectSuggestion(v)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                      background: isSelected ? '#00C280' : 'var(--surface-card)',
                      color: isSelected ? '#fff' : '#00875a',
                      borderColor: isSelected ? '#00C280' : 'rgba(0,194,128,0.3)',
                      boxShadow: isSelected ? '0 2px 6px rgba(0,194,128,0.35)' : 'none',
                    }}
                    title={`Click to load "${v}"`}
                  >
                    <span>{v}</span>
                  </button>
                )
              })}
            </div>

            {/* If there were multiple previous turns with different questions, show quick links */}
            {allDistinctCachedQuestions.length > 1 && (
              <div className="mt-2.5 pt-2 border-t flex items-center gap-2 flex-wrap text-xs" style={{ borderColor: 'rgba(0,194,128,0.15)' }}>
                <span className="text-neutral-400 text-[11px]">Earlier cached turns:</span>
                {allDistinctCachedQuestions.slice(0, -1).map(q => (
                  <button
                    key={q}
                    onClick={() => handleSelectSuggestion(q)}
                    className="text-[11px] text-neutral-600 hover:text-[#00C280] underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    &ldquo;{q}&rdquo;
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Typeahead / Autocomplete as user types */}
        {matchingVariations.length > 0 && (
          <div className="p-2.5 rounded-xl border flex flex-col gap-1.5 text-xs"
            style={{ background: 'var(--surface-secondary)', borderColor: 'rgba(0,194,128,0.35)' }}>
            <div className="text-[11px] font-semibold text-neutral-500">
              Matching Cached Variations (Click to select):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchingVariations.slice(0, 5).map(m => (
                <button
                  key={m}
                  onClick={() => handleSelectSuggestion(m)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all text-left hover:scale-102 cursor-pointer"
                  style={{
                    background: input.trim().toLowerCase() === m.toLowerCase() ? '#00C280' : 'rgba(0,194,128,0.1)',
                    color: input.trim().toLowerCase() === m.toLowerCase() ? '#fff' : '#00875a',
                    borderColor: 'rgba(0,194,128,0.35)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea + Send */}
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={turns.length > 0 
              ? "Ask again or select an option above to test cache hit..." 
              : "Ask anything... (first ask = MISS stored in Infinia, repeat = HIT retrieved instantly)"}
            className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: inputIsCacheHitCandidate ? '#00C280' : 'var(--border-default)', background: 'var(--surface-secondary)', color: 'var(--text-primary)', minHeight: '52px', maxHeight: '120px' }}
            rows={1}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-2 px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={inputIsCacheHitCandidate ? { background: '#00C280', boxShadow: '0 2px 8px rgba(0,194,128,0.35)' } : undefined}
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Thinking...' : inputIsCacheHitCandidate ? 'Test Hit' : 'Send'}
          </button>
        </div>
      </div>

      {/* Floating scroll-to-top button — appears after scrolling past the toolbar */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title="Scroll to top — access toolbar buttons"
            className="fixed z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90"
            style={{
              bottom: '88px',
              right: '24px',
              background: '#00C280',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(0,194,128,0.35)',
            }}
          >
            <ChevronUp className="w-4 h-4" />
            Back to top
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
