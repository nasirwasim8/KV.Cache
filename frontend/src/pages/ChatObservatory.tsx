import { useState, useRef, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import { Send, Trash2, Zap, Database, ToggleLeft, ToggleRight, Info, Upload, Download, ChevronDown, ChevronUp, DollarSign, Hash, RotateCcw, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { kvApi, ChatResponse, PanelMetrics, PricingTier, PRICING_TIERS } from '../services/api'

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

function MetricCard({ label, value, unit, highlight, icon: Icon }: {
  label: string; value: string | number; unit?: string; highlight?: 'green' | 'red' | 'blue'; icon?: any
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
              <div className="badge badge-success text-xs">⚡ INFINIA HIT</div>
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

// ─── TurnRow ──────────────────────────────────────────────────────────────────

function TurnRow({ turn, idx }: { turn: Turn; idx: number }) {
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

          {/* LEFT — No Cache */}
          <div style={{ background: 'var(--surface-card)' }}>
            <PanelHeader title="No KV Cache" subtitle="Full GPU recompute every turn" isCache={false} source="GPU_COMPUTED" />
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
                  <div className="metric-label" style={{ fontSize: '9px' }}>COST</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Infinia Cache */}
          <div className={isHit ? 'cache-hit-flash' : ''} style={{ background: 'var(--surface-card)' }}>
            <PanelHeader
              title="DDN Infinia Cache"
              subtitle={isHit ? 'Served from Infinia Object Store' : isMiss ? 'First compute → stored in Infinia' : 'KV state from object store'}
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
                  <div className="metric-label" style={{ fontSize: '9px' }}>COST</div>
                </div>
              </div>
              {isMiss && (
                <div className="mt-2 p-2 rounded-lg flex items-center gap-1.5 text-xs" style={{ background: 'rgba(26,129,175,0.08)', color: '#1A81AF' }}>
                  <Database className="w-3 h-3 flex-shrink-0" />
                  Computed & stored in Infinia — <strong>ask again to see the cache hit!</strong>
                  {(turn.right?.store_latency_ms ?? 0) > 0 && (
                    <span className="ml-1 opacity-60">({n(turn.right?.store_latency_ms)}ms write)</span>
                  )}
                </div>
              )}
              {turn.infinia_object && <InfiniaObjectCard obj={turn.infinia_object} />}
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

export default function ChatObservatory() {
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
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 350)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
          `⚡ INFINIA HIT — ${result.savings?.speedup_x ?? '?'}x faster · ${n(result.savings?.pct)}% cheaper`,
          { duration: 4000, icon: '🗄️' }
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
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Live Chat Observatory</h2>
            <p className="section-description">Watch DDN Infinia KV Cache eliminate GPU recomputation. Every cache hit is a real S3 GET from Infinia.</p>
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

        {/* Pricing info pill */}
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {/* Main pill row */}
          <div className="flex items-center gap-2 text-xs px-3 py-2" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
            <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PRICING_TIERS[pricingTier].color }} />
            <span className="flex-1">
              <strong style={{ color: PRICING_TIERS[pricingTier].color }}>{PRICING_TIERS[pricingTier].label}</strong>
              {pricingTier === 'self_hosted_h100'
                ? <>{' '}— H100 compute cost: <strong>$0.70/1M</strong> input · <strong>$2.80/1M</strong> output. {PRICING_TIERS[pricingTier].note}</>
                : <>{' '}— <strong>${PRICING_TIERS[pricingTier].input_per_1m}/1M</strong> input + <strong>${PRICING_TIERS[pricingTier].output_per_1m}/1M</strong> output. {PRICING_TIERS[pricingTier].note}</>
              }
            </span>
            {pricingTier === 'self_hosted_h100' && (
              <button
                onClick={() => setShowCostMath(m => !m)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono transition-all"
                style={{
                  background: showCostMath ? 'rgba(0,194,128,0.15)' : 'rgba(0,194,128,0.06)',
                  color: '#00C280',
                  border: '1px solid rgba(0,194,128,0.3)',
                }}
                title="Show how these rates are derived from H100 hardware cost"
              >
                {showCostMath ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showCostMath ? 'Hide math' : 'How?'}
              </button>
            )}
          </div>

          {/* Expandable math breakdown — self-hosted H100 only */}
          <AnimatePresence>
            {showCostMath && pricingTier === 'self_hosted_h100' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 py-3 font-mono text-xs space-y-2"
                  style={{ background: 'rgba(0,194,128,0.04)', borderTop: '1px solid rgba(0,194,128,0.15)', color: 'var(--text-secondary)' }}>

                  <div className="text-xs font-semibold mb-2 font-sans" style={{ color: '#00C280', letterSpacing: '0.05em' }}>
                    HOW THESE RATES ARE DERIVED — H100 HARDWARE COST ONLY (LLAMA IS FREE)
                  </div>

                  {/* Assumptions */}
                  <div className="grid grid-cols-3 gap-x-6 gap-y-1 mb-3">
                    {[
                      ['H100 market rate', '~$3.00 / hr', 'cloud spot or on-prem amortized'],
                      ['Input processing', '~1,500 tokens/s', 'Llama 3.x prefill on H100'],
                      ['Output generation', '~400 tokens/s', 'autoregressive decode — slower'],
                    ].map(([k, v, sub]) => (
                      <div key={k}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{k}</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Input math */}
                  <div className="rounded p-2" style={{ background: 'rgba(0,194,128,0.07)' }}>
                    <div style={{ color: '#00C280', fontWeight: 700, marginBottom: '4px' }}>INPUT COST</div>
                    <div style={{ color: 'var(--text-secondary)' }}>1,000,000 tokens ÷ 1,500 tok/s = 667 seconds = 0.185 H100-hours</div>
                    <div style={{ color: 'var(--text-secondary)' }}>0.185 × $3.00 = $0.56 ≈ <strong style={{ color: '#00C280' }}>$0.70 / 1M</strong> <span style={{ color: 'var(--text-muted)' }}>(+overhead & thermal margin)</span></div>
                  </div>

                  {/* Output math */}
                  <div className="rounded p-2" style={{ background: 'rgba(0,194,128,0.07)' }}>
                    <div style={{ color: '#00C280', fontWeight: 700, marginBottom: '4px' }}>OUTPUT COST</div>
                    <div style={{ color: 'var(--text-secondary)' }}>1,000,000 tokens ÷ 400 tok/s = 2,500 seconds = 0.69 H100-hours</div>
                    <div style={{ color: 'var(--text-secondary)' }}>0.69 × $3.00 = $2.08 ≈ <strong style={{ color: '#00C280' }}>$2.80 / 1M</strong> <span style={{ color: 'var(--text-muted)' }}>(+overhead & thermal margin)</span></div>
                  </div>

                  <div className="text-xs font-sans pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid rgba(0,194,128,0.1)', paddingTop: '6px' }}>
                    ✅ With DDN Infinia KV cache, cached input tokens skip prefill entirely — <strong style={{ color: '#00C280' }}>zero GPU time, zero cost</strong>. You only pay for new question tokens and the output.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Session Savings"   value={`$${n(cumulativeSavings, 4)}`} highlight="green" icon={DollarSign} />
        <MetricCard label="Cache Hit Rate"    value={`${hitRate}%`}                 highlight={hitRate > 0 ? 'green' : undefined} icon={Zap} />
        <MetricCard label="Tokens Saved"      value={totalTokensSaved.toLocaleString()} icon={Hash} />
        <MetricCard label="Conversation Turns" value={turns.length}                 icon={Database} />
      </div>

      {/* Panel Column Headers */}
      <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border-subtle)' }}>
        <div className="p-3 text-center font-semibold text-sm" style={{ background: 'rgba(237,39,56,0.04)', color: '#ED2738' }}>
          ❌ WITHOUT KV CACHE<br /><span className="text-xs font-normal text-neutral-500">Full context recomputed every turn</span>
        </div>
        <div className="p-3 text-center font-semibold text-sm" style={{ background: 'rgba(0,194,128,0.04)', color: '#00C280' }}>
          ✅ WITH DDN INFINIA KV CACHE<br /><span className="text-xs font-normal text-neutral-500">KV state retrieved from Infinia Object Store</span>
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
          <span className="text-xl">⚡</span>
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
          turns.map((turn, i) => <TurnRow key={turn.id} turn={turn} idx={i} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card p-4">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (first ask = MISS stored in Infinia, repeat = HIT retrieved instantly)"
            className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: 'var(--border-default)', background: 'var(--surface-secondary)', color: 'var(--text-primary)', minHeight: '52px', maxHeight: '120px', focusRingColor: '#ED2738' } as any}
            rows={1}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-2 px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Thinking...' : 'Send'}
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
