import { useState, useRef, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react'
import { Send, Trash2, Zap, Database, ToggleLeft, ToggleRight, Info, Upload, Download, ChevronDown, ChevronUp, DollarSign, Hash, RotateCcw } from 'lucide-react'
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
        <div className="flex justify-end p-3">
          <div className="chat-bubble-user">{turn.userMessage}</div>
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
              isCache={true}
              source={turn.right?.source}
              latency={turn.right?.infinia_latency_ms}
            />
            <div className="p-3">
              <div className="chat-bubble-ai text-xs leading-relaxed mb-3">{turn.response}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                  <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>
                    {n(turn.right?.ttft_ms)}ms
                  </div>
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

              {/* Cache HIT summary bar */}
              {isHit && (
                <div className="mt-2 p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold" style={{ background: 'rgba(0,194,128,0.08)', color: '#00C280' }}>
                  <Database className="w-3 h-3 flex-shrink-0" />
                  {n(turn.right?.infinia_latency_ms)}ms S3 GET
                  <span className="mx-1 opacity-40">·</span>
                  {turn.savings?.speedup_x ?? '—'}× faster
                  <span className="mx-1 opacity-40">·</span>
                  {n(turn.savings?.pct)}% cheaper
                  <span className="mx-1 opacity-40">·</span>
                  {turn.savings?.tokens_saved ?? 0} tokens saved
                </div>
              )}

              {/* First MISS hint */}
              {isMiss && (
                <div className="mt-2 p-2 rounded-lg flex items-center gap-1.5 text-xs" style={{ background: 'rgba(26,129,175,0.08)', color: '#1A81AF' }}>
                  <Database className="w-3 h-3 flex-shrink-0" />
                  Computed & stored in Infinia — <strong>ask again to see the cache hit!</strong>
                  {(turn.right?.store_latency_ms ?? 0) > 0 && (
                    <span className="ml-1 opacity-60">({n(turn.right?.store_latency_ms)}ms write)</span>
                  )}
                </div>
              )}

              {/* Infinia Object Inspector */}
              {turn.infinia_object && (
                <InfiniaObjectCard obj={turn.infinia_object} />
              )}
            </div>
          </div>
        </div>
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
  const [sessionId] = useState(() => `sess_${Date.now()}`)
  const [cumulativeSavings, setCumulativeSavings] = useState(0)
  const [totalHits, setTotalHits] = useState(0)
  const [gpuFlushed, setGpuFlushed] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [persistedTurns, setPersistedTurns] = useState(0)
  const [resumeLatency, setResumeLatency] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

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
      // Step 1: persist current conversation to Infinia
      const res = await kvApi.persistSession(sessionId)
      setPersistedTurns(res.turns_persisted || turns.length)
      // Step 2: wipe local session memory (GPU forgot you)
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

  // Purge ALL objects from Infinia — makes next question a genuine MISS
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

  const DEMO_QUESTIONS = [
    'What is DDN Infinia?',
    'Explain KV cache in LLMs',
    'How does Infinia compare to storing KV cache in RAM?',
    'What is the cost benefit of prefix caching?',
    'Summarize the key benefits for enterprise AI',
  ]

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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
            >
              {demoMode === 'business' ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5 text-[#1A81AF]" />}
              {demoMode === 'business' ? 'Business' : 'Technical'} Mode
            </button>
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear UI
            </button>
            {/* GPU Memory Flush button */}
            <button
              onClick={flushGpuMemory}
              disabled={turns.length === 0}
              title="Persist conversation to Infinia then clear GPU memory — demonstrates session eviction"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80"
              style={{ borderColor: 'rgba(237,39,56,0.4)', color: '#ED2738', background: 'rgba(237,39,56,0.06)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
            </button>
          </div>
        </div>

        {/* Pricing info pill */}
        <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PRICING_TIERS[pricingTier].color }} />
          <span>
            <strong style={{ color: PRICING_TIERS[pricingTier].color }}>{PRICING_TIERS[pricingTier].label}</strong>
            {' '}— Billed <strong>${PRICING_TIERS[pricingTier].input_per_1m}/1M</strong> input + <strong>${PRICING_TIERS[pricingTier].output_per_1m}/1M</strong> output.
            {' '}{PRICING_TIERS[pricingTier].note}
          </span>
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
            <div className="text-4xl">🗄️</div>
            <div className="font-semibold text-neutral-700">Ask a question to start the demo</div>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              First question → MISS (stored in Infinia). Ask <strong>same question again</strong> → HIT (instantly retrieved). The Infinia Object Inspector shows exactly what was stored.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {DEMO_QUESTIONS.map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-full text-xs border font-medium hover:border-ddn-red hover:text-ddn-red transition-colors"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  {q}
                </button>
              ))}
            </div>
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
    </div>
  )
}
