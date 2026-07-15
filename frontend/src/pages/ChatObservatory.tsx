import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Trash2, RefreshCw, Zap, Database, Clock, DollarSign, Hash, ToggleLeft, ToggleRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { kvApi, ChatResponse, PanelMetrics } from '../services/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Turn {
  id: string
  userMessage: string
  response: string
  timestamp: number
  cacheHit: boolean
  left: PanelMetrics
  right: PanelMetrics
  savings: { cost_usd: number; pct: number; speedup_x: number; tokens_saved: number }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
              {latency !== undefined && <div className="text-xs font-mono" style={{ color: '#00C280' }}>{latency.toFixed(0)}ms</div>}
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

function TurnRow({ turn, idx }: { turn: Turn; idx: number }) {
  const isHit = turn.right.source === 'INFINIA_CACHE'
  const isMiss = turn.right.source === 'FIRST_MISS_STORED'

  return (
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

      {/* Side-by-side response panels */}
      <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--border-subtle)' }}>
        {/* Left — No Cache: always GPU recompute, token count grows with history */}
        <div style={{ background: 'var(--surface-card)' }}>
          <PanelHeader title="No KV Cache" subtitle="Full GPU recompute every turn" isCache={false} source="GPU_COMPUTED" />
          <div className="p-3">
            <div className="chat-bubble-ai text-xs leading-relaxed mb-3">{turn.response}</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="metric-card p-2" style={{ borderColor: 'rgba(237,39,56,0.2)', background: 'rgba(237,39,56,0.04)' }}>
                <div className="font-mono text-sm font-bold" style={{ color: '#ED2738' }}>{turn.left.ttft_ms.toFixed(0)}ms</div>
                <div className="metric-label" style={{ fontSize: '9px' }}>TTFT</div>
              </div>
              <div className="metric-card p-2" style={{ borderColor: 'rgba(237,39,56,0.2)', background: 'rgba(237,39,56,0.04)' }}>
                <div className="font-mono text-sm font-bold" style={{ color: '#ED2738' }}>{turn.left.tokens_sent}</div>
                <div className="metric-label" style={{ fontSize: '9px' }}>TOKENS SENT</div>
              </div>
              <div className="metric-card p-2" style={{ borderColor: 'rgba(237,39,56,0.2)', background: 'rgba(237,39,56,0.04)' }}>
                <div className="font-mono text-sm font-bold" style={{ color: '#ED2738' }}>${turn.left.cost_usd.toFixed(4)}</div>
                <div className="metric-label" style={{ fontSize: '9px' }}>COST</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — With Cache */}
        <div className={isHit ? 'cache-hit-flash' : ''} style={{ background: 'var(--surface-card)' }}>
          <PanelHeader
            title="DDN Infinia Cache"
            subtitle={isHit ? 'Served from Infinia Object Store' : isMiss ? 'First compute → stored in Infinia' : 'KV state from object store'}
            isCache={true}
            source={turn.right.source}
            latency={turn.right.infinia_latency_ms}
          />
          <div className="p-3">
            <div className="chat-bubble-ai text-xs leading-relaxed mb-3">{turn.response}</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>
                  {isHit ? `${turn.right.ttft_ms.toFixed(0)}ms` : `${turn.right.ttft_ms.toFixed(0)}ms`}
                </div>
                <div className="metric-label" style={{ fontSize: '9px' }}>TTFT</div>
              </div>
              <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>
                  {isHit ? `${turn.right.tokens_sent} ✓` : turn.right.tokens_sent}
                </div>
                <div className="metric-label" style={{ fontSize: '9px' }}>TOKENS {isHit ? 'SAVED' : 'SENT'}</div>
              </div>
              <div className="metric-card p-2" style={isHit ? { background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' } : {}}>
                <div className="font-mono text-sm font-bold" style={{ color: isHit ? '#00C280' : 'var(--text-primary)' }}>
                  ${isHit ? turn.right.cost_usd.toFixed(7) : turn.right.cost_usd.toFixed(4)}
                </div>
                <div className="metric-label" style={{ fontSize: '9px' }}>COST</div>
              </div>
            </div>

            {/* Cache HIT summary bar */}
            {isHit && (
              <div className="mt-2 p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold" style={{ background: 'rgba(0,194,128,0.08)', color: '#00C280' }}>
                <Database className="w-3 h-3 flex-shrink-0" />
                {turn.right.infinia_latency_ms?.toFixed(0)}ms S3 GET
                <span className="mx-1 opacity-40">·</span>
                {turn.savings.speedup_x}× faster
                <span className="mx-1 opacity-40">·</span>
                {turn.savings.pct.toFixed(0)}% cheaper
                <span className="mx-1 opacity-40">·</span>
                {turn.savings.tokens_saved} tokens saved
              </div>
            )}

            {/* First MISS hint */}
            {isMiss && (
              <div className="mt-2 p-2 rounded-lg flex items-center gap-1.5 text-xs" style={{ background: 'rgba(26,129,175,0.08)', color: '#1A81AF' }}>
                <Database className="w-3 h-3 flex-shrink-0" />
                Computed &amp; stored in Infinia — <strong>ask again to see the cache hit!</strong>
                {turn.right.store_latency_ms && <span className="ml-1 opacity-60">({turn.right.store_latency_ms.toFixed(0)}ms write)</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatObservatory() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState<'business' | 'technical'>('business')
  const [sessionId] = useState(() => `sess_${Date.now()}`)
  const [cumulativeSavings, setCumulativeSavings] = useState(0)
  const [totalHits, setTotalHits] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setLoading(true)

    try {
      const result: ChatResponse = await kvApi.sendChat({ session_id: sessionId, message: msg, demo_mode: demoMode })
      const turn: Turn = {
        id: `t${Date.now()}`, userMessage: msg, response: result.response,
        timestamp: Date.now(), cacheHit: result.cache_hit,
        left: result.left, right: result.right, savings: result.savings,
      }
      setTurns(prev => [...prev, turn])
      if (result.cache_hit) {
        setCumulativeSavings(p => p + (result.savings.cost_usd || 0))
        setTotalHits(p => p + 1)
        toast.success(
          `⚡ INFINIA HIT — ${result.savings.speedup_x}x faster · ${result.savings.pct.toFixed(0)}% cheaper · $${(result.savings.cost_usd || 0).toFixed(5)} saved`,
          { duration: 4000, icon: '🗄️' }
        )
      } else {
        toast('◯ Cache MISS — response stored in Infinia. Ask again to see the hit! →', { duration: 3000, icon: '💾' })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Request failed — is Ollama running?')
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, demoMode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearSession = async () => {
    await kvApi.clearSession(sessionId).catch(() => {})
    setTurns([]); setCumulativeSavings(0); setTotalHits(0)
    toast.success('Session cleared')
  }

  const hitRate = turns.length > 0 ? Math.round((totalHits / turns.length) * 100) : 0
  const totalTokensSaved = turns.reduce((a, t) => a + (t.savings.tokens_saved || 0), 0)

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
            <p className="section-description">Watch DDN Infinia KV Cache eliminate GPU recomputation in real time. Every cache hit is a real S3 GET from Infinia.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <button
              onClick={() => setDemoMode(m => m === 'business' ? 'technical' : 'business')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
            >
              {demoMode === 'business' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4 text-[#1A81AF]" />}
              {demoMode === 'business' ? 'Business' : 'Technical'} Mode
            </button>
            <button onClick={clearSession} className="btn-secondary flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Session Stats Bar */}
      {turns.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-3">
          <MetricCard label="Session Savings" value={`$${cumulativeSavings.toFixed(4)}`} highlight="green" icon={DollarSign} />
          <MetricCard label="Cache Hit Rate" value={`${hitRate}%`} highlight={hitRate >= 50 ? 'green' : 'blue'} icon={Database} />
          <MetricCard label="Tokens Saved" value={totalTokensSaved.toLocaleString()} icon={Hash} />
          <MetricCard label="Conversation Turns" value={turns.length} icon={RefreshCw} />
        </motion.div>
      )}

      {/* Main Observatory Panel */}
      <div className="card overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-2 gap-px border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--border-subtle)' }}>
          <div className="p-3 flex items-center gap-2" style={{ background: 'var(--surface-secondary)' }}>
            <span className="text-base">❌</span>
            <div>
              <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Without KV Cache</div>
              <div className="text-xs text-neutral-500">Full context recomputed every turn</div>
            </div>
          </div>
          <div className="p-3 flex items-center gap-2" style={{ background: 'rgba(0,194,128,0.04)' }}>
            <span className="text-base">✅</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#00C280' }}>With DDN Infinia KV Cache</div>
              <div className="text-xs text-neutral-500">KV state retrieved from Infinia Object Store</div>
            </div>
          </div>
        </div>

        {/* Turns */}
        <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
          {turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-4xl mb-4">🔬</div>
              <p className="text-neutral-600 font-medium">Start a conversation to observe KV Cache in action</p>
              <p className="text-sm text-neutral-400 mt-1">Step 1: Ask any question → MISS (both compute, result stored in Infinia)</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: '#00C280' }}>Step 2: Ask the SAME question → RIGHT panel shows ⚡ INFINIA HIT with real latency!</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                {DEMO_QUESTIONS.map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all hover:border-[#ED2738] hover:text-[#ED2738]"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {turns.map((turn, i) => <TurnRow key={turn.id} turn={turn} idx={i} />)}
              {loading && (
                <div className="p-4 flex items-center gap-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex gap-1.5"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>
                  <span className="text-sm text-neutral-500">Ollama generating on RTX 5090...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex gap-3 items-end">
            <textarea
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask anything… try asking the same question twice to see the cache hit!"
              className="input-field flex-1 resize-none" rows={2} disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-primary h-12 px-6">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Press Enter to send · Shift+Enter for new line · Ask same question again to trigger Infinia cache hit
          </p>
        </div>
      </div>

      {/* How it works box */}
      {demoMode === 'technical' && (
        <div className="card p-5" style={{ borderLeft: '3px solid #1A81AF' }}>
          <h4 className="font-semibold text-sm mb-3" style={{ color: '#1A81AF' }}>🔧 Technical Mode: What's happening</h4>
          <div className="grid grid-cols-2 gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Left Panel (No Cache):</strong>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                <li>Build full prompt: system + history + new message</li>
                <li>POST /api/generate to Ollama with all tokens</li>
                <li>Measure real TTFT from streaming response</li>
                <li>Count total tokens sent (full context)</li>
              </ol>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Right Panel (Infinia Cache):</strong>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                <li>Hash conversation context → lookup key</li>
                <li>GET <code className="font-mono bg-black/5 px-1 rounded">kvcache/{'<hash>'}.json</code> from Infinia S3</li>
                <li>HIT: Infinia read latency = TTFT. Only new tokens counted.</li>
                <li>MISS: Same as left + PUT response to Infinia for next time</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
