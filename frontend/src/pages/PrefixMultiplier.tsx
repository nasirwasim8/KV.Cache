import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Database, Zap, DollarSign, Clock, RefreshCw, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { kvApi } from '../services/api'

interface ScenarioMeta { name: string; icon: string; description: string; daily_requests: number; system_tokens: number; example_queries: string[] }
interface RunResult {
  no_cache: { time_ms: number; ttft_ms: number; tokens_sent: number; cost_usd: number; response: string }
  with_cache: { time_ms: number; infinia_latency_ms: number; ollama_time_ms: number; tokens_sent: number; cost_usd: number; source: string; response: string; infinia_key: string }
  savings: { time_ms: number; cost_usd: number; pct: number; speedup_x: number; tokens_saved: number }
  scale: { daily_requests: number; monthly_savings_usd: number; annual_savings_usd: number; gpu_hours_saved_monthly: number }
  request_number: number
}

// Animated counter
function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', className = '' }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; className?: string
}) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    const start = displayed; const end = value
    const diff = end - start; const duration = 600
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(start + diff * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])
  return <span className={className}>{prefix}{displayed.toFixed(decimals)}{suffix}</span>
}

// Waterfall bar
function WaterfallRow({ result, maxTime, isCurrent }: { result: RunResult; maxTime: number; isCurrent: boolean }) {
  const barWidth = (t: number) => `${Math.max(2, (t / maxTime) * 100)}%`
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border transition-all ${isCurrent ? 'ring-2 ring-[#ED2738]' : ''}`}
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-neutral-500">REQ #{result.request_number}</span>
          {result.with_cache.source === 'INFINIA_HIT' ? (
            <span className="badge badge-success text-xs">⚡ INFINIA HIT</span>
          ) : result.with_cache.source === 'MISS_SEED_FIRST' ? (
            <span className="badge badge-error text-xs">SEED FIRST</span>
          ) : (
            <span className="badge badge-info text-xs">FIRST COMPUTE + CACHED</span>
          )}
        </div>
        {result.with_cache.source === 'INFINIA_HIT' && (
          <span className="font-semibold text-sm" style={{ color: '#00C280' }}>
            {result.savings.speedup_x}x faster · ${result.savings.cost_usd.toFixed(5)} saved
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* No cache bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500 flex items-center gap-1"><span className="text-red-500">❌</span> Without Cache</span>
            <span className="font-mono text-xs text-neutral-700">{result.no_cache.time_ms.toFixed(0)}ms · {result.no_cache.tokens_sent} tokens · ${result.no_cache.cost_usd.toFixed(5)}</span>
          </div>
          <div className="h-6 rounded bg-neutral-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: barWidth(result.no_cache.time_ms) }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded"
              style={{ background: 'linear-gradient(90deg, #ED2738, #ff6b7a)' }}
            />
          </div>
        </div>

        {/* With cache bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs flex items-center gap-1" style={{ color: '#00C280' }}><span>✅</span> With DDN Infinia</span>
            <span className="font-mono text-xs" style={{ color: '#00C280' }}>
              <span title="Total end-to-end response time (Infinia fetch + LLM decode of new tokens only)">{result.with_cache.time_ms.toFixed(0)}ms total</span>
              {' · '}{result.with_cache.tokens_sent} tokens · ${result.with_cache.cost_usd.toFixed(5)}
              {result.with_cache.source === 'INFINIA_HIT' && (
                <span className="ml-1 text-neutral-400" title="Time for the S3 GET to retrieve the cached prefix from DDN Infinia">
                  (Infinia lookup: {result.with_cache.infinia_latency_ms.toFixed(1)}ms)
                </span>
              )}
            </span>
          </div>
          <div className="h-6 rounded overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: barWidth(result.with_cache.time_ms) }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="h-full rounded"
              style={{ background: result.with_cache.source === 'INFINIA_HIT' ? 'linear-gradient(90deg, #00C280, #4deba0)' : 'linear-gradient(90deg, #1A81AF, #4da6d4)' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function PrefixMultiplier() {
  const [scenarios, setScenarios] = useState<Record<string, ScenarioMeta>>({})
  const [activeScenario, setActiveScenario] = useState<string>('contact_center')
  const [seeded, setSeeded] = useState<Record<string, boolean>>({})
  const [shuffledQueries, setShuffledQueries] = useState<string[]>([])
  const CHIPS_SHOWN = 5
  const [seedInfo, setSeedInfo] = useState<Record<string, any>>({})
  const [seeding, setSeeding] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RunResult[]>([])
  const [customQuery, setCustomQuery] = useState('')

  useEffect(() => {
    kvApi.getScenarios().then(d => setScenarios(d.scenarios)).catch(() => {})
  }, [])

  const scenario = scenarios[activeScenario]
  const maxTime = results.length > 0 ? Math.max(...results.map(r => r.no_cache.time_ms)) : 1

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const r = await kvApi.seedPrefix(activeScenario)
      setSeeded(prev => ({ ...prev, [activeScenario]: true }))
      setSeedInfo(prev => ({ ...prev, [activeScenario]: r }))
      toast.success(`✅ Prefix seeded in Infinia — ${r.context_tokens} tokens → ${r.context_size_kb}KB object stored in ${r.infinia_store_ms.toFixed(0)}ms`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Seed failed — is Ollama running?')
    } finally { setSeeding(false) }
  }

  // Fisher-Yates shuffle
  const shuffle = (arr: string[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Re-shuffle whenever the active scenario or its data changes
  useEffect(() => {
    const sc = scenarios[activeScenario]
    if (sc) setShuffledQueries(shuffle(sc.example_queries))
  }, [activeScenario, scenarios])

  const reshuffle = () => {
    const sc = scenarios[activeScenario]
    if (sc) setShuffledQueries(shuffle(sc.example_queries))
  }

  const handleRun = async () => {
    if (!scenario) return
    const query = customQuery.trim() || shuffledQueries[results.length % Math.max(1, shuffledQueries.length)]
    setRunning(true)
    try {
      const r = await kvApi.runPrefix(activeScenario, query, results.length + 1)
      setResults(prev => [...prev, r])
      if (r.with_cache.source === 'INFINIA_HIT') {
        toast.success(`⚡ ${r.savings.speedup_x}x faster via Infinia · $${r.savings.cost_usd.toFixed(5)} saved`)
      } else if (r.with_cache.source === 'MISS_SEED_FIRST') {
        toast.error('Seed the prefix first!', { icon: '⚠️' })
      } else {
        toast.success('First compute done — result stored in Infinia. Run again for cache hit!')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Run failed')
    } finally { setRunning(false) }
  }

  const cumulativeSavings = results.reduce((a, r) => a + r.savings.cost_usd, 0)
  const lastResult = results[results.length - 1]
  const scaleProjection = lastResult?.scale

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h2 className="section-title">Prefix Cache Multiplier</h2>
        <p className="section-description">
          Seed a long system prompt into DDN Infinia once. Every subsequent request retrieves the KV state from Infinia — never recomputes the prefix.
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 text-neutral-700">Choose Industry Scenario</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(scenarios).map(([key, sc]) => (
            <button key={key}
              onClick={() => { setActiveScenario(key); setResults([]) }}
              className="p-4 rounded-xl border text-left transition-all"
              style={{
                borderColor: activeScenario === key ? 'var(--ddn-red)' : 'var(--border-subtle)',
                background: activeScenario === key ? 'rgba(237,39,56,0.05)' : 'var(--surface-card)',
                boxShadow: activeScenario === key ? '0 0 0 2px rgba(237,39,56,0.1)' : 'none',
              }}
            >
              <div className="text-2xl mb-2">{sc.icon}</div>
              <div className="font-semibold text-sm text-neutral-900">{sc.name}</div>
              <div className="text-xs text-neutral-500 mt-1">{sc.description}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge badge-info text-xs">{sc.system_tokens.toLocaleString()} tokens</span>
                <span className="text-xs text-neutral-400">{sc.daily_requests.toLocaleString()}/day</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Seed Panel */}
      {scenario && (
        <div className="card-elevated p-5" style={{ borderLeft: '3px solid #1A81AF' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#1A81AF]" />
                Step 1: Seed Prefix into DDN Infinia
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Generate KV context for the <strong>{scenario.system_tokens.toLocaleString()}-token</strong> system prompt and store it as a JSON object in Infinia.
              </p>
            </div>
            <button onClick={handleSeed} disabled={seeding} className="btn-primary" style={{ background: seeded[activeScenario] ? '#00C280' : undefined }}>
              {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : seeded[activeScenario] ? '✅ Re-Seed' : '🌱 Seed Prefix'}
            </button>
          </div>

          {seedInfo[activeScenario] && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: 'System Tokens', value: seedInfo[activeScenario].system_tokens?.toLocaleString() },
                { label: 'KV Context Size', value: `${seedInfo[activeScenario].context_size_kb} KB` },
                { label: 'Compute Time', value: `${seedInfo[activeScenario].compute_time_ms?.toFixed(0)}ms` },
                { label: 'Infinia Store', value: `${seedInfo[activeScenario].infinia_store_ms?.toFixed(0)}ms` },
              ].map(item => (
                <div key={item.label} className="metric-card">
                  <div className="metric-value" style={{ fontSize: '1.2rem', color: '#1A81AF' }}>{item.value}</div>
                  <div className="metric-label">{item.label}</div>
                </div>
              ))}
            </div>
          )}
          {seedInfo[activeScenario] && (
            <div className="mt-3 text-xs text-neutral-500 flex items-center gap-2">
              <Database className="w-3 h-3" />
              Stored at: <code className="font-mono bg-black/5 px-1 rounded">{seedInfo[activeScenario].infinia_key}</code>
              in bucket <code className="font-mono bg-black/5 px-1 rounded">{seedInfo[activeScenario].infinia_bucket}</code>
            </div>
          )}
        </div>
      )}

      {/* Run Panel */}
      {scenario && (
        <div className="card-elevated p-5" style={{ borderLeft: '3px solid #ED2738' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-[#ED2738]" />
                Step 2: Run Requests — Watch Savings Stack Up
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Each request: WITHOUT cache sends all {scenario.system_tokens.toLocaleString()} tokens. WITH cache retrieves KV from Infinia + sends only the question.
              </p>
            </div>
            <button onClick={handleRun} disabled={running || !seeded[activeScenario]}
              className={seeded[activeScenario] ? 'btn-primary' : 'btn-secondary'}
              title={!seeded[activeScenario] ? 'Seed the prefix first!' : ''}>
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Run Request #{results.length + 1}</>}
            </button>
          </div>

          {/* Custom query input */}
          <div className="flex gap-3 mb-4">
            <input value={customQuery} onChange={e => setCustomQuery(e.target.value)}
              placeholder={`Custom query (or leave blank for auto: "${shuffledQueries[0] ?? '…'}")`}
              className="input-field flex-1 text-sm" style={{ padding: '8px 12px' }} />
          </div>

          {/* Example query chips */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Quick questions — click to load
              </span>
              <button
                onClick={reshuffle}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all hover:border-[#ED2738] hover:text-[#ED2738]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', background: 'var(--surface-card)' }}
                title="Randomise questions"
              >
                <RefreshCw className="w-3 h-3" /> Shuffle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {shuffledQueries.slice(0, CHIPS_SHOWN).map(q => (
                <button key={q} onClick={() => setCustomQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all hover:border-[#ED2738] hover:text-[#ED2738]"
                  style={{
                    borderColor: customQuery === q ? '#ED2738' : 'var(--border-default)',
                    color: customQuery === q ? '#ED2738' : 'var(--text-muted)',
                    background: customQuery === q ? 'rgba(237,39,56,0.05)' : 'var(--surface-card)',
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Waterfall Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {results.map((r, i) => (
                  <WaterfallRow key={i} result={r} maxTime={maxTime} isCurrent={i === results.length - 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {results.length === 0 && (
            <div className="py-8 text-center text-neutral-400 text-sm">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Seed the prefix, then click "Run Request" to see the waterfall build up.
            </div>
          )}
        </div>
      )}

      {/* Cumulative Savings + Scale Projection */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6" style={{ borderTop: '3px solid #00C280' }}>
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: '#00C280' }} />
            Cumulative Savings & Scale Projection
          </h3>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="metric-card" style={{ background: 'rgba(0,194,128,0.08)', borderColor: 'rgba(0,194,128,0.2)' }}>
              <AnimatedNumber value={cumulativeSavings} decimals={5} prefix="$" className="metric-value" style={{ color: '#00C280', fontSize: '1.4rem', fontFamily: 'var(--font-mono)', fontWeight: 700 } as any} />
              <div className="metric-label">Session Savings (Total)</div>
              <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px', lineHeight: 1.3 }}>
                Sum of {results.filter(r => r.with_cache.source === 'INFINIA_HIT').length} cache hit{results.filter(r => r.with_cache.source === 'INFINIA_HIT').length !== 1 ? 's' : ''} in this session
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ fontSize: '1.4rem' }}>{results.filter(r => r.with_cache.source === 'INFINIA_HIT').length}/{results.length}</div>
              <div className="metric-label">Cache Hits</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ fontSize: '1.4rem', color: '#1A81AF' }}>
                {lastResult?.savings.speedup_x || 1}x
              </div>
              <div className="metric-label">Last Speedup</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ fontSize: '1.4rem' }}>
                {lastResult?.savings.pct?.toFixed(0) || 0}%
              </div>
              <div className="metric-label">Cost Reduction</div>
            </div>
          </div>

          {scaleProjection && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(0,194,128,0.06)', border: '1px solid rgba(0,194,128,0.2)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00C280' }}>
                  📊 Scale to {scaleProjection.daily_requests.toLocaleString()} requests/day ({scenario?.name})
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', textAlign: 'right', lineHeight: 1.4, maxWidth: '260px' }}>
                  Based on <span style={{ fontFamily: 'monospace', color: '#00C280', fontWeight: 700 }}>${lastResult?.savings.cost_usd.toFixed(5)}</span> saved per request
                  &nbsp;×&nbsp;{scaleProjection.daily_requests.toLocaleString()}/day&nbsp;×&nbsp;30 days
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Monthly Savings', value: `$${scaleProjection.monthly_savings_usd.toLocaleString()}` },
                  { label: 'Annual Savings', value: `$${scaleProjection.annual_savings_usd.toLocaleString()}` },
                  { label: 'GPU Hours Saved/Month', value: `${scaleProjection.gpu_hours_saved_monthly.toFixed(0)} hrs` },
                ].map(item => (
                  <div key={item.label}>
                    <div className="font-mono font-bold text-xl" style={{ color: '#00C280' }}>{item.value}</div>
                    <div className="text-xs text-neutral-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Formula breakdown */}
              <div className="mt-3 rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'rgba(0,194,128,0.2)' }}>
                {[
                  {
                    label: 'Monthly Savings',
                    formula: `$${lastResult?.savings.cost_usd.toFixed(5)} saved/req × ${scaleProjection.daily_requests.toLocaleString()}/day × 30 days`,
                    value: `$${scaleProjection.monthly_savings_usd.toLocaleString()}`,
                  },
                  {
                    label: 'Annual Savings',
                    formula: `$${scaleProjection.monthly_savings_usd.toLocaleString()}/month × 12`,
                    value: `$${scaleProjection.annual_savings_usd.toLocaleString()}`,
                  },
                  {
                    label: 'GPU Hours Saved/Month',
                    formula: `(${lastResult?.savings.time_ms.toFixed(0)}ms saved/req ÷ 3,600,000) × ${scaleProjection.daily_requests.toLocaleString()}/day × 30 days`,
                    value: `${scaleProjection.gpu_hours_saved_monthly.toFixed(0)} hrs`,
                  },
                ].map((row, i) => (
                  <div key={row.label} className="flex flex-col px-3 py-2"
                    style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'rgba(0,194,128,0.03)' }}>
                    <div className="flex justify-between items-start">
                      <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                      <span className="font-mono font-bold ml-2 flex-shrink-0" style={{ color: '#00C280' }}>{row.value}</span>
                    </div>
                    <div className="font-mono mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                      = {row.formula}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.68rem', color: '#aaa', borderTop: '1px solid rgba(0,194,128,0.15)', paddingTop: '10px' }}>
                <em>Scale projection multiplies the <strong>per-request savings</strong> (${lastResult?.savings.cost_usd.toFixed(5)} cost · {lastResult?.savings.time_ms.toFixed(0)}ms compute) by daily volume and 30 days.</em>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
