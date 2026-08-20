import { useState, useRef, useEffect, useCallback } from 'react'
import { Activity, Play, Square, Copy, Check, ChevronDown, RotateCcw, Clock, Zap, TrendingUp, BarChart3, Terminal } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface RunConfig {
  model: string
  tokenizer: string
  endpoint_url: string
  context_tokens: number
  output_tokens_mean: number
  concurrency: number
  request_count: number
  warmup_count: number
}

interface LiveMetrics {
  ttft_avg_ms?: number
  ttft_p99_ms?: number
  ttft_p50_ms?: number
  output_throughput_per_user?: number
  e2e_throughput_per_user?: number
  request_latency_avg_ms?: number
  request_latency_p99_ms?: number
  output_token_throughput?: number
  request_throughput?: number
  benchmark_duration_sec?: number
  request_count?: number
}

interface RunResults extends LiveMetrics {
  ttft_min_ms?: number
  ttft_max_ms?: number
  ttft_p90_ms?: number
  output_seq_len?: number
  input_seq_len?: number
  csv_path?: string
  json_path?: string
}

const PRESETS = [
  { label: 'Quick (4K / c1 / 20 req)', context: 4000,   concurrency: 1,  requests: 20, warmup: 2 },
  { label: 'Standard (16K / c1 / 50 req)', context: 16000,  concurrency: 1,  requests: 50, warmup: 4 },
  { label: 'Deep (126K / c1 / 50 req)',   context: 126000, concurrency: 1,  requests: 50, warmup: 4 },
  { label: 'Scale (16K / c4 / 100 req)',  context: 16000,  concurrency: 4,  requests: 100, warmup: 4 },
]

const CTX_OPTIONS = [
  { label: '4K tokens',   value: 4000 },
  { label: '8K tokens',   value: 8000 },
  { label: '16K tokens',  value: 16000 },
  { label: '32K tokens',  value: 32000 },
  { label: '64K tokens',  value: 64000 },
  { label: '126K tokens', value: 126000 },
]

// ── Animated number ────────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }: { value?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) return
    const diff = value - display
    const steps = 20
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplay(prev => prev + diff / steps)
      if (i >= steps) { setDisplay(value); clearInterval(id) }
    }, 20)
    return () => clearInterval(id)
  }, [value])
  if (!value) return <span className="text-[var(--text-muted)]">—</span>
  return <span>{Math.round(display).toLocaleString()}{suffix}</span>
}

// ── Metric card ────────────────────────────────────────────────────────────────
function MetricCard({
  label, value, suffix = '', color = 'default', icon
}: {
  label: string; value?: number; suffix?: string; color?: string; icon?: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    default: 'var(--text-primary)',
    green:   'var(--nvidia-green)',
    red:     'var(--ddn-red)',
    blue:    'var(--status-info)',
  }
  return (
    <div className="metric-card flex flex-col gap-1" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
        {icon && <span className="opacity-60">{icon}</span>}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value" style={{ color: colorMap[color] }}>
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
    </div>
  )
}

// ── Percentile bar ─────────────────────────────────────────────────────────────
function PercentileBar({ label, value, max, color }: { label: string; value?: number; max: number; color: string }) {
  const pct = value && max ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono w-20 text-right" style={{ color: 'var(--text-primary)' }}>
        {value ? `${Math.round(value).toLocaleString()} ms` : '—'}
      </span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AIperfBenchmark() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [config, setConfig] = useState<RunConfig>({
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    tokenizer: '',
    endpoint_url: 'http://localhost:8000',
    context_tokens: 16000,
    output_tokens_mean: 100,
    concurrency: 1,
    request_count: 50,
    warmup_count: 4,
  })

  const [runId, setRunId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error' | 'stopped'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [metrics, setMetrics] = useState<LiveMetrics>({})
  const [results, setResults] = useState<RunResults | null>(null)
  const [command, setCommand] = useState('')
  const [duration, setDuration] = useState(0)
  const [copied, setCopied] = useState(false)
  const [showCtxDropdown, setShowCtxDropdown] = useState(false)
  const [requestsCompleted, setRequestsCompleted] = useState(0)

  const terminalRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  // Parse "Requests: 42/100" from log lines
  useEffect(() => {
    const last = logs[logs.length - 1] || ''
    const m = last.match(/(\d+)\s*\/\s*(\d+)/)
    if (m) setRequestsCompleted(parseInt(m[1]))
  }, [logs])

  const startRun = useCallback(async () => {
    setLogs([])
    setMetrics({})
    setResults(null)
    setCommand('')
    setDuration(0)
    setRequestsCompleted(0)
    setStatus('running')

    try {
      const res = await fetch('/api/aiperf/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(await res.text())
      const { run_id } = await res.json()
      setRunId(run_id)

      // Connect SSE
      const es = new EventSource(`/api/aiperf/stream/${run_id}`)
      eventSourceRef.current = es

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          if (event.type === 'log') {
            setLogs(prev => [...prev, event.line])
          } else if (event.type === 'metrics') {
            setMetrics(prev => ({ ...prev, ...event.data }))
          } else if (event.type === 'done') {
            setStatus('done')
            setResults(event.results || {})
            setCommand(event.command || '')
            setDuration(event.duration_sec || 0)
            setMetrics(prev => ({ ...prev, ...(event.results || {}) }))
            es.close()
          } else if (event.type === 'error') {
            setStatus('error')
            setLogs(prev => [...prev, `❌ ${event.message}`])
            es.close()
          }
        } catch {}
      }
      es.onerror = () => {
        if (status === 'running') setStatus('error')
        es.close()
      }
    } catch (err) {
      setStatus('error')
      setLogs([`Failed to start: ${err}`])
    }
  }, [config])

  const stopRun = useCallback(async () => {
    if (runId) {
      await fetch(`/api/aiperf/run/${runId}`, { method: 'DELETE' })
    }
    eventSourceRef.current?.close()
    setStatus('stopped')
  }, [runId])

  const copyCommand = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const applyPreset = (p: typeof PRESETS[0]) => {
    setConfig(c => ({ ...c, context_tokens: p.context, concurrency: p.concurrency, request_count: p.requests, warmup_count: p.warmup }))
  }

  const progress = config.request_count > 0 ? Math.min((requestsCompleted / config.request_count) * 100, 100) : 0
  const maxTTFT = Math.max(metrics.ttft_p99_ms || 0, metrics.ttft_avg_ms || 0, 100)

  // Log line colorizer
  const colorize = (line: string) => {
    if (line.includes('❌') || line.toLowerCase().includes('error')) return '#ED2738'
    if (line.includes('✅') || line.toLowerCase().includes('complete') || line.toLowerCase().includes('done')) return '#76B900'
    if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn')) return '#FF7600'
    if (line.startsWith('aiperf') || line.startsWith('$')) return '#1A81AF'
    return dark ? 'rgba(245,246,248,0.7)' : 'rgba(32,30,30,0.7)'
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'var(--nvidia-green-light)' }}>
            <Activity className="w-5 h-5" style={{ color: 'var(--nvidia-green)' }} />
          </div>
          <div>
            <h1 className="section-title">AIperf Benchmark</h1>
            <p className="section-description">
              Live LLM inference benchmarking via NVIDIA Dynamo + vLLM + DDN Infinia KV Cache
            </p>
          </div>
          {status === 'running' && (
            <span className="badge badge-nvidia ml-auto flex items-center gap-1.5">
              <span className="status-dot status-dot-success status-dot-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Main layout: config left, terminal right */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* ── Config Panel ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>PRESETS</h3>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: 'var(--surface-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ddn-red)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>CONFIGURATION</h3>

            {/* Model */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>MODEL</label>
              <input className="input-field text-sm" value={config.model}
                onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
                disabled={status === 'running'} />
            </div>

            {/* Endpoint */}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>DYNAMO ENDPOINT</label>
              <input className="input-field text-sm font-mono" value={config.endpoint_url}
                onChange={e => setConfig(c => ({ ...c, endpoint_url: e.target.value }))}
                disabled={status === 'running'} />
            </div>

            {/* Context length dropdown */}
            <div className="space-y-1 relative">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>CONTEXT LENGTH</label>
              <button
                onClick={() => setShowCtxDropdown(v => !v)}
                disabled={status === 'running'}
                className="w-full input-field text-sm text-left flex items-center justify-between"
                style={{ padding: '10px 16px' }}
              >
                <span>{CTX_OPTIONS.find(o => o.value === config.context_tokens)?.label ?? `${config.context_tokens} tokens`}</span>
                <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
              {showCtxDropdown && (
                <div className="absolute z-20 w-full mt-1 card py-1 shadow-lg">
                  {CTX_OPTIONS.map(o => (
                    <button key={o.value}
                      onClick={() => { setConfig(c => ({ ...c, context_tokens: o.value })); setShowCtxDropdown(false) }}
                      className="w-full text-left px-4 py-2 text-sm transition-all duration-100"
                      style={{ color: config.context_tokens === o.value ? 'var(--ddn-red)' : 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Concurrency + requests */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>CONCURRENCY</label>
                <input type="number" className="input-field text-sm" min={1} max={32}
                  value={config.concurrency}
                  onChange={e => setConfig(c => ({ ...c, concurrency: +e.target.value }))}
                  disabled={status === 'running'} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>REQUESTS</label>
                <input type="number" className="input-field text-sm" min={1}
                  value={config.request_count}
                  onChange={e => setConfig(c => ({ ...c, request_count: +e.target.value }))}
                  disabled={status === 'running'} />
              </div>
            </div>

            {/* Output tokens + warmup */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>OUTPUT TOKENS</label>
                <input type="number" className="input-field text-sm" min={1}
                  value={config.output_tokens_mean}
                  onChange={e => setConfig(c => ({ ...c, output_tokens_mean: +e.target.value }))}
                  disabled={status === 'running'} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>WARMUP</label>
                <input type="number" className="input-field text-sm" min={0}
                  value={config.warmup_count}
                  onChange={e => setConfig(c => ({ ...c, warmup_count: +e.target.value }))}
                  disabled={status === 'running'} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {status !== 'running' ? (
                <button onClick={startRun} className="btn-primary flex-1 gap-2">
                  <Play className="w-4 h-4" />
                  Run Benchmark
                </button>
              ) : (
                <button onClick={stopRun} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-150"
                  style={{ background: '#ED2738' }}>
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              )}
              {status !== 'running' && (
                <button onClick={() => { setLogs([]); setMetrics({}); setResults(null); setStatus('idle') }}
                  className="btn-secondary p-2.5" title="Reset">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: terminal + metrics ───────────────────────────────── */}
        <div className="space-y-4">

          {/* Progress bar when running */}
          {status === 'running' && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="font-mono">Requests: {requestsCompleted} / {config.request_count}</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'var(--nvidia-green)' }} />
              </div>
            </div>
          )}

          {/* Live metrics */}
          {(status === 'running' || status === 'done') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="TTFT AVG" value={metrics.ttft_avg_ms} suffix=" ms"
                color={metrics.ttft_avg_ms && metrics.ttft_avg_ms < 500 ? 'green' : 'red'}
                icon={<Clock className="w-3.5 h-3.5" />} />
              <MetricCard label="THROUGHPUT" value={metrics.output_throughput_per_user} suffix=" t/s/u"
                color="green" icon={<TrendingUp className="w-3.5 h-3.5" />} />
              <MetricCard label="LATENCY P99" value={metrics.request_latency_p99_ms} suffix=" ms"
                icon={<BarChart3 className="w-3.5 h-3.5" />} />
              <MetricCard label="DURATION" value={duration || undefined} suffix=" s"
                color="blue" icon={<Zap className="w-3.5 h-3.5" />} />
            </div>
          )}

          {/* Terminal */}
          <div className="card overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2 border-b"
              style={{ borderColor: 'var(--border-subtle)', background: dark ? '#0D0C0C' : '#1C1A1A' }}>
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#76B900]" />
                <span className="text-xs font-mono text-[#76B900]">aiperf output</span>
                {status === 'running' && (
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </span>
                )}
              </div>
              {command && (
                <button onClick={copyCommand} className="flex items-center gap-1 text-xs transition-all duration-150"
                  style={{ color: copied ? '#76B900' : 'rgba(255,255,255,0.4)' }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy cmd'}
                </button>
              )}
            </div>

            {/* Terminal body */}
            <div
              ref={terminalRef}
              className="overflow-y-auto p-4 space-y-0.5"
              style={{
                height: 320,
                background: dark ? '#0D0C0C' : '#141313',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
            >
              {logs.length === 0 && status === 'idle' && (
                <div style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Configure and click <span style={{ color: '#76B900' }}>[Run Benchmark]</span> to start…
                </div>
              )}
              {logs.map((line, i) => (
                <div key={i} style={{ color: colorize(line), lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {line || '\u00a0'}
                </div>
              ))}
              {status === 'running' && (
                <div style={{ color: '#76B900' }}>
                  <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>▊</span>
                </div>
              )}
            </div>
          </div>

          {/* Results: percentile bars */}
          {results && status === 'done' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  TTFT LATENCY PERCENTILES
                </h3>
                <span className="badge badge-nvidia text-xs">✅ Complete</span>
              </div>
              <div className="space-y-3">
                <PercentileBar label="p50" value={results.ttft_p50_ms} max={maxTTFT} color="#76B900" />
                <PercentileBar label="p90" value={results.ttft_p90_ms} max={maxTTFT} color="#FF7600" />
                <PercentileBar label="p99" value={results.ttft_p99_ms} max={maxTTFT} color="#ED2738" />
                <PercentileBar label="avg" value={results.ttft_avg_ms} max={maxTTFT} color="#1A81AF" />
              </div>

              {/* Full results table */}
              <div className="mt-4 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr style={{ background: 'var(--surface-secondary)' }}>
                      {['Metric', 'avg', 'p50', 'p90', 'p99'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold"
                          style={{ color: 'var(--text-muted)' }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'TTFT (ms)', avg: results.ttft_avg_ms, p50: results.ttft_p50_ms, p90: results.ttft_p90_ms, p99: results.ttft_p99_ms },
                      { label: 'Req Latency (ms)', avg: results.request_latency_avg_ms, p50: undefined, p90: undefined, p99: results.request_latency_p99_ms },
                      { label: 'Throughput (t/s/u)', avg: results.output_throughput_per_user },
                      { label: 'E2E Throughput', avg: results.e2e_throughput_per_user },
                      { label: 'Token Throughput/s', avg: results.output_token_throughput },
                    ].map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                        {['avg', 'p50', 'p90', 'p99'].map(k => (
                          <td key={k} className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>
                            {(row as any)[k] !== undefined ? Math.round((row as any)[k]).toLocaleString() : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Command used */}
              {command && (
                <div className="mt-2">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>COMMAND USED</div>
                  <div className="relative p-3 rounded-lg text-xs font-mono overflow-x-auto"
                    style={{ background: dark ? '#0D0C0C' : '#141313', color: '#76B900' }}>
                    $ {command}
                    <button onClick={copyCommand} className="absolute top-2 right-2 p-1 rounded"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="card p-4 border-l-4" style={{ borderLeftColor: 'var(--ddn-red)', background: 'var(--status-error-subtle)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--ddn-red)' }}>Benchmark failed</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Check the terminal output above. Make sure the Dynamo endpoint is reachable at <code className="font-mono">{config.endpoint_url}</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
