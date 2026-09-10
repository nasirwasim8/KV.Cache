import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Play, Zap, AlertCircle, ChevronDown } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Preset { key: string; label: string; icon: string; sample_questions: string[] }

interface PhaseState {
  status: 'idle' | 'running' | 'done' | 'error'
  message: string
  ttft_ms: number | null
  total_ms: number | null
  response: string
}

interface InfiniaMeta {
  prefix_hash: string
  prefix_hash_full: string
  prefix_tokens: number
  question_tokens: number
  kv_size_mb: number
  kv_size_bytes: number
  block_count: number
  block_size: number
  layers: number
  kv_heads: number
  head_dim: number
  dtype: string
  model: string
  bucket: string
  endpoint: string
  transfer_mode: string
  object_key: string
  gpu_compute_saved_pct: number
}

interface ConfirmedObject {
  key: string
  size_bytes: number
  size_mb: number
  last_modified: string
}

interface Summary {
  cold_ttft_ms: number
  warm_ttft_ms: number
  speedup: number
  tokens_in_context: number
  preset: string
  infinia?: InfiniaMeta
  confirmed_infinia_objects?: ConfirmedObject[]
}

const EMPTY_PHASE: PhaseState = { status: 'idle', message: '', ttft_ms: null, total_ms: null, response: '' }

// ── TTFT gauge ─────────────────────────────────────────────────────────────────
function TTFTGauge({ ttft_ms, max, label, color }: { ttft_ms: number | null; max: number; label: string; color: string }) {
  const pct = ttft_ms ? Math.min((ttft_ms / max) * 100, 100) : 0
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="font-mono text-2xl font-bold" style={{ color }}>
          {ttft_ms !== null ? `${ttft_ms.toLocaleString()} ms` : '—'}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Response panel ─────────────────────────────────────────────────────────────
function ResponsePanel({
  phase, label, subtitle, borderColor, badgeColor, badgeText
}: {
  phase: PhaseState; label: string; subtitle?: string; borderColor: string; badgeColor: string; badgeText: string
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return (
    <div className="card flex flex-col gap-4 p-5" style={{ borderTop: `3px solid ${borderColor}` }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
          {subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        <span className="badge text-xs" style={{ background: `${badgeColor}20`, color: badgeColor }}>
          {badgeText}
        </span>
      </div>

      {/* TTFT display */}
      <div className="metric-card text-center py-4">
        <div className="metric-label">TIME TO FIRST TOKEN</div>
        <div className="metric-value mt-2" style={{
          color: phase.ttft_ms !== null
            ? (phase.ttft_ms < 500 ? 'var(--status-success)' : phase.ttft_ms < 2000 ? 'var(--status-warning)' : 'var(--status-error)')
            : 'var(--text-muted)',
          fontSize: '2.5rem',
        }}>
          {phase.ttft_ms !== null ? `${phase.ttft_ms.toLocaleString()}` : '—'}
          {phase.ttft_ms !== null && <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>ms</span>}
        </div>
      </div>

      {/* Status message */}
      {phase.message && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {phase.status === 'running' && (
            <span className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </span>
          )}
          {phase.status === 'done' && <span style={{ color: '#76B900' }}>✓</span>}
          {phase.status === 'error' && <AlertCircle className="w-4 h-4" style={{ color: 'var(--ddn-red)' }} />}
          <span>{phase.message}</span>
        </div>
      )}

      {/* Response text */}
      {phase.response && (
        <div className="rounded-lg p-4 text-sm leading-relaxed"
          style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'var(--surface-secondary)',
            color: 'var(--text-primary)',
            maxHeight: 200,
            overflowY: 'auto',
            fontFamily: 'var(--font-sans)',
          }}>
          {phase.response}
        </div>
      )}

      {/* Cache indicator */}
      {phase.status === 'done' && (
        <div className="flex items-center gap-2 text-xs font-medium"
          style={{ color: badgeColor }}>
          <Zap className="w-3.5 h-3.5" />
          {badgeText.includes('✅') ? 'KV Cache HIT → Retrieved from DDN Infinia' : 'KV blocks written to GPU HBM · No persistent cache'}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function KVReuseProof() {
  const { theme } = useTheme()

  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState('legal_contract')
  const [customQuestion, setCustomQuestion] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('http://localhost:11000')
  const [model, setModel] = useState('meta-llama/Llama-3.1-8B-Instruct')
  const [showQDropdown, setShowQDropdown] = useState(false)

  const [coldPhase, setColdPhase] = useState<PhaseState>(EMPTY_PHASE)
  const [warmPhase, setWarmPhase] = useState<PhaseState>(EMPTY_PHASE)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [running, setRunning] = useState(false)
  const [sessionTotal, setSessionTotal] = useState({ runs: 0, savedMs: 0, tokens: 0 })
  const [vllmError, setVllmError] = useState<{ message: string; detail: string } | null>(null)

  const esRef = useRef<EventSource | null>(null)

  // Load presets
  useEffect(() => {
    fetch('/api/kv-reuse/presets')
      .then(r => r.json())
      .then(d => setPresets(d.presets || []))
      .catch(() => {})
  }, [])

  const currentPreset = presets.find(p => p.key === selectedPreset)

  const runComparison = useCallback(async () => {
    if (running) return
    setRunning(true)
    setColdPhase(EMPTY_PHASE)
    setWarmPhase(EMPTY_PHASE)
    setSummary(null)
    setVllmError(null)

    const question = customQuestion.trim() || selectedQuestion || ''
    const params = new URLSearchParams({
      endpoint_url: endpointUrl,
      model,
      preset: selectedPreset,
      question,
    })

    const es = new EventSource(`/api/kv-reuse/compare?${params}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        if (event.type === 'status') {
          const setter = event.phase === 'cold' ? setColdPhase : setWarmPhase
          setter(prev => ({ ...prev, status: 'running', message: event.message }))
        }

        else if (event.type === 'ttft') {
          const setter = event.phase === 'cold' ? setColdPhase : setWarmPhase
          setter(prev => ({ ...prev, ttft_ms: event.ttft_ms, total_ms: event.total_ms, status: 'done' }))

          // Cache hit flash on warm panel
          if (event.phase === 'warm') {
            const el = document.getElementById('warm-panel')
            if (el) { el.classList.add('cache-hit-flash'); setTimeout(() => el.classList.remove('cache-hit-flash'), 600) }
          }
        }

        else if (event.type === 'response') {
          const setter = event.phase === 'cold' ? setColdPhase : setWarmPhase
          setter(prev => ({ ...prev, response: event.text }))
        }

        else if (event.type === 'summary') {
          setSummary(event)
          setSessionTotal(prev => ({
            runs: prev.runs + 1,
            savedMs: prev.savedMs + (event.cold_ttft_ms - event.warm_ttft_ms),
            tokens: prev.tokens + (event.tokens_in_context || 0),
          }))
          setRunning(false)
          es.close()
        }

        else if (event.type === 'error') {
          if (event.code === 'VLLM_NOT_RUNNING') {
            setVllmError({ message: event.message, detail: event.detail || '' })
            setColdPhase(EMPTY_PHASE)
            setWarmPhase(EMPTY_PHASE)
          } else {
            setColdPhase(prev => prev.status === 'running' ? { ...prev, status: 'error', message: event.message } : prev)
            setWarmPhase(prev => prev.status === 'running' ? { ...prev, status: 'error', message: event.message } : prev)
          }
          setRunning(false)
          es.close()
        }
      } catch {}
    }

    es.onerror = () => {
      setRunning(false)
      es.close()
    }
  }, [running, endpointUrl, model, selectedPreset, customQuestion, selectedQuestion])

  const maxTTFT = Math.max(coldPhase.ttft_ms || 0, warmPhase.ttft_ms || 0, 1000)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'var(--ddn-red-light)' }}>
            <RefreshCw className="w-5 h-5" style={{ color: 'var(--ddn-red)' }} />
          </div>
          <div>
            <h1 className="section-title">KV Cache Reuse Proof</h1>
            <p className="section-description">
              Send the same long-context prompt twice — watch DDN Infinia eliminate recomputation
            </p>
          </div>
        </div>
      </div>

      {/* vLLM not running banner */}
      {vllmError && (
        <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: 'rgba(237,39,56,0.5)' }}>
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(237,39,56,0.08)' }}>
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--ddn-red)' }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--ddn-red)' }}>vLLM is not running</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                KV Reuse Proof requires vLLM on <span className="font-mono">{endpointUrl}</span>. Start it from your WSL terminal:
              </p>
            </div>
            <button onClick={() => setVllmError(null)}
              className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="p-4 space-y-3">
            <div className="rounded-lg p-3 font-mono text-xs leading-relaxed overflow-x-auto"
              style={{ background: 'var(--surface-secondary)', color: '#76B900' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}># Activate env and start vLLM</div>
              source ~/dynamo-env/bin/activate<br />
              <br />
              VLLM_USE_FLASHINFER_SAMPLER=0 python -m vllm.entrypoints.openai.api_server \<br />
              &nbsp;&nbsp;--model ~/models/Llama-3.1-8B-Instruct \<br />
              &nbsp;&nbsp;--served-model-name "meta-llama/Llama-3.1-8B-Instruct" \<br />
              &nbsp;&nbsp;--enable-prefix-caching \<br />
              &nbsp;&nbsp;--enforce-eager \<br />
              &nbsp;&nbsp;--port 11000 \<br />
              &nbsp;&nbsp;--max-model-len 16384
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              vLLM takes 60–90 seconds to load. Once ready, click <strong>Run KV Reuse Demo</strong> again.
              You can also check the <strong>AIperf Benchmark</strong> page — it shows a live vLLM status indicator.
            </p>
          </div>
        </div>
      )}

      {/* Session savings ticker */}
      {sessionTotal.runs > 0 && (
        <div className="card p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: 'var(--nvidia-green)' }} />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              This Session
            </span>
          </div>
          {[
            { label: 'Demo Runs', value: sessionTotal.runs.toString() },
            { label: 'TTFT Saved', value: `${(sessionTotal.savedMs / 1000).toFixed(1)}s` },
            { label: 'Context Tokens Cached', value: sessionTotal.tokens.toLocaleString() },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg" style={{ color: 'var(--nvidia-green)' }}>{item.value}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Config row */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>DYNAMO ENDPOINT</label>
            <input className="input-field text-sm font-mono" value={endpointUrl}
              onChange={e => setEndpointUrl(e.target.value)} disabled={running} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>MODEL</label>
            <input className="input-field text-sm" value={model}
              onChange={e => setModel(e.target.value)} disabled={running} />
          </div>
        </div>

        {/* Preset selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presets.map(p => (
            <button key={p.key} onClick={() => { setSelectedPreset(p.key); setSelectedQuestion(''); setCustomQuestion('') }}
              disabled={running}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border"
              style={{
                background: selectedPreset === p.key ? 'var(--ddn-red-light)' : 'var(--surface-secondary)',
                borderColor: selectedPreset === p.key ? 'var(--ddn-red)' : 'var(--border-subtle)',
                color: selectedPreset === p.key ? 'var(--ddn-red)' : 'var(--text-secondary)',
              }}>
              <span>{p.icon}</span>
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Question selector */}
        {currentPreset && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SAMPLE QUESTION</label>
              <button
                onClick={() => setShowQDropdown(v => !v)}
                disabled={running}
                className="w-full input-field text-sm text-left flex items-center justify-between gap-2"
                style={{ padding: '10px 14px' }}>
                <span className="truncate" style={{ color: selectedQuestion ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {selectedQuestion || 'Select a question…'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              </button>
              {showQDropdown && (
                <div className="absolute z-20 w-full mt-1 card py-1 shadow-lg">
                  {currentPreset.sample_questions.map(q => (
                    <button key={q} onClick={() => { setSelectedQuestion(q); setCustomQuestion(''); setShowQDropdown(false) }}
                      className="w-full text-left px-4 py-2 text-sm transition-all duration-100"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>OR TYPE YOUR OWN</label>
              <input className="input-field text-sm" placeholder="Ask anything about the document…"
                value={customQuestion} onChange={e => { setCustomQuestion(e.target.value); setSelectedQuestion('') }}
                disabled={running} />
            </div>
          </div>
        )}

        {/* Run button */}
        <div className="mt-4">
          <button onClick={runComparison} disabled={running}
            className="btn-primary gap-2 w-full sm:w-auto">
            {running ? (
              <>
                <span className="flex gap-1">
                  {[0, 1, 2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s`, background: 'white' }} />)}
                </span>
                Running comparison…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Comparison
              </>
            )}
          </button>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Runs the same document + question twice — first cold (GPU must recompute all tokens), then warm (prefix KV blocks
            already in GPU HBM, served instantly). LMCache asynchronously persists KV tensors to DDN Infinia so they survive GPU restarts.
          </p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsePanel
          phase={coldPhase}
          label="🖥️ COLD — Full Recompute"
          subtitle="GPU computes every token · KV blocks written to HBM + LMCache"
          borderColor="var(--ddn-red)"
          badgeColor="var(--ddn-red)"
          badgeText="❌ Cold — GPU Recomputes Prefill"
        />
        <div id="warm-panel">
          <ResponsePanel
            phase={warmPhase}
            label="⚡ WARM — Prefix Cache Hit"
            subtitle="GPU HBM hit · KV blocks reused · LMCache persisting to Infinia"
            borderColor="var(--nvidia-green)"
            badgeColor="var(--nvidia-green)"
            badgeText="✅ Warm — GPU HBM Prefix Cache Hit"
          />
        </div>
      </div>

      {/* TTFT comparison bars */}
      {(coldPhase.ttft_ms !== null || warmPhase.ttft_ms !== null) && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>TTFT COMPARISON</h3>
          <TTFTGauge ttft_ms={coldPhase.ttft_ms} max={maxTTFT} label="COLD (Full Recompute)" color="var(--ddn-red)" />
          <TTFTGauge ttft_ms={warmPhase.ttft_ms} max={maxTTFT} label="WARM (GPU HBM Hit)" color="var(--nvidia-green)" />
        </div>
      )}

      {/* Summary banner */}
      {summary && (
        <div className="card p-6 text-center space-y-3"
          style={{ border: '2px solid var(--nvidia-green)', background: 'var(--nvidia-green-light)' }}>
          <div className="text-5xl font-black font-mono" style={{ color: 'var(--nvidia-green)' }}>
            {summary.speedup}×
          </div>
          <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            faster Time to First Token with Prefix Caching
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>Cold: <strong>{summary.cold_ttft_ms.toLocaleString()} ms</strong></span>
            <span>Warm: <strong className="text-[var(--nvidia-green)]">{summary.warm_ttft_ms.toLocaleString()} ms</strong></span>
            <span>Context: <strong>{summary.tokens_in_context.toLocaleString()} tokens</strong> cached</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Warm hit served from GPU HBM prefix cache — LMCache asynchronously persists these {summary.tokens_in_context.toLocaleString()} tokens
            to DDN Infinia so they survive GPU restarts and scale across your entire GPU fleet
          </div>
        </div>
      )}

      {/* Infinia KV Inspector */}
      {summary?.infinia && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--nvidia-green)', borderWidth: 1 }}>

          {/* ── Section 1: Real Infinia Confirmation ── */}
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: 'linear-gradient(90deg, rgba(118,185,0,0.12) 0%, rgba(118,185,0,0.04) 100%)' }}>
            <span style={{ fontSize: 16 }}>💾</span>
            <span className="text-sm font-bold" style={{ color: 'var(--nvidia-green)' }}>
              DDN Infinia — Live Bucket Scan
            </span>
            {summary.confirmed_infinia_objects && summary.confirmed_infinia_objects.length > 0 ? (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: 'rgba(118,185,0,0.2)', color: 'var(--nvidia-green)', border: '1px solid rgba(118,185,0,0.4)' }}>
                ✓ {summary.confirmed_infinia_objects.length} OBJECT{summary.confirmed_infinia_objects.length > 1 ? 'S' : ''} CONFIRMED
              </span>
            ) : (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,150,0,0.15)', color: '#FF9600', border: '1px solid rgba(255,150,0,0.3)' }}>
                ⚡ GPU HBM — NOT YET IN INFINIA
              </span>
            )}
          </div>

          {/* Confirmed objects list — real S3 keys */}
          {summary.confirmed_infinia_objects && summary.confirmed_infinia_objects.length > 0 ? (
            <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {summary.confirmed_infinia_objects.map((obj, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                           background: 'rgba(118,185,0,0.03)' }}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(118,185,0,0.15)', color: 'var(--nvidia-green)', flexShrink: 0 }}>
                    S3
                  </span>
                  <span className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}
                    title={obj.key}>
                    {obj.key}
                  </span>
                  <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {obj.size_mb} MB
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {new Date(obj.last_modified).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs leading-relaxed"
              style={{ background: 'rgba(255,150,0,0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: '#FF9600' }}>No new objects written to Infinia during this run.</strong>
              {' '}The KV tensors are being served from <strong>GPU HBM prefix cache</strong> (this session is still active).
              To see Infinia writes: <strong>restart vLLM</strong> to flush HBM, then run the test again.
              LMCache will then fetch from Infinia instead of recomputing.
            </div>
          )}

          {/* ── Section 2: Estimated KV Tensor Architecture ── */}
          <div className="px-4 py-2.5 flex items-center gap-2"
            style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              KV Tensor Architecture (calculated from model spec)
            </span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              ESTIMATED
            </span>
          </div>

          {/* Subheader: bucket + estimated key */}
          <div className="px-4 py-1.5 text-xs font-mono flex items-center gap-2"
            style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{summary.infinia.bucket}</span>
            <span>/</span>
            <span>{summary.infinia.object_key}</span>
          </div>

          {/* Grid of details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {[
              { label: 'BUCKET',             val: summary.infinia.bucket },
              { label: 'OBJECT KEY',         val: summary.infinia.object_key },
              { label: 'ENDPOINT',           val: summary.infinia.endpoint },
              { label: 'KV SIZE',            val: `${summary.infinia.kv_size_mb.toLocaleString()} MB (${(summary.infinia.kv_size_bytes / 1e9).toFixed(2)} GB)` },
              { label: 'BLOCKS CACHED',      val: `${summary.infinia.block_count.toLocaleString()} blocks × ${summary.infinia.block_size} tokens` },
              { label: 'LAYERS STORED',      val: `${summary.infinia.layers} transformer layers` },
              { label: 'PREFIX TOKENS',      val: `${summary.infinia.prefix_tokens.toLocaleString()} token IDs` },
              { label: 'NEW GPU TOKENS',     val: `${summary.infinia.question_tokens} tokens only` },
              { label: 'GPU COMPUTE SAVED',  val: `${summary.infinia.gpu_compute_saved_pct}% of prefill` },
            ].map(({ label, val }) => (
              <div key={label} className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: 'var(--text-muted)' }}>{label}</div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* KV Hash */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-secondary)' }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>KV PREFIX HASH (SHA-256)</div>
            <div className="font-mono text-xs break-all" style={{ color: 'var(--nvidia-green)' }}>
              {summary.infinia.prefix_hash_full}
            </div>
          </div>

          {/* Footer explainer */}
          <div className="px-4 py-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>What is the KV state?</strong>{' '}
            {summary.infinia.prefix_tokens.toLocaleString()} token IDs — the Key+Value attention matrices across {summary.infinia.layers} transformer layers
            ({summary.infinia.kv_heads} KV heads × {summary.infinia.head_dim} head_dim, {summary.infinia.dtype}).
            On a cache hit, these are loaded directly into GPU HBM — skipping GPU re-computation of all{' '}
            {summary.infinia.prefix_tokens.toLocaleString()} prefix tokens.
          </div>
        </div>
      )}
    </div>
  )
}
