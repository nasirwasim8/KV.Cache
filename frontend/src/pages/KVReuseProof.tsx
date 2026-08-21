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

interface Summary {
  cold_ttft_ms: number
  warm_ttft_ms: number
  speedup: number
  tokens_in_context: number
  preset: string
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
          setColdPhase(prev => prev.status === 'running' ? { ...prev, status: 'error', message: event.message } : prev)
          setWarmPhase(prev => prev.status === 'running' ? { ...prev, status: 'error', message: event.message } : prev)
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
            Runs the same document + question twice — first on GPU HBM only (full recompute), then with DDN Infinia KV Cache (NIXL retrieval). Live proof of cache speedup.
          </p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsePanel
          phase={coldPhase}
          label="🖥️ GPU HBM ONLY"
          subtitle="No persistent cache · Full recompute on every session"
          borderColor="var(--ddn-red)"
          badgeColor="var(--ddn-red)"
          badgeText="❌ Cold — GPU Recomputes Prefill"
        />
        <div id="warm-panel">
          <ResponsePanel
            phase={warmPhase}
            label="✅ WITH DDN INFINIA"
            subtitle="Persistent AI Memory · Zero GPU recompute"
            borderColor="var(--nvidia-green)"
            badgeColor="var(--nvidia-green)"
            badgeText="✅ Warm — Fetched from Infinia"
          />
        </div>
      </div>

      {/* TTFT comparison bars */}
      {(coldPhase.ttft_ms !== null || warmPhase.ttft_ms !== null) && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>TTFT COMPARISON</h3>
          <TTFTGauge ttft_ms={coldPhase.ttft_ms} max={maxTTFT} label="GPU HBM ONLY" color="var(--ddn-red)" />
          <TTFTGauge ttft_ms={warmPhase.ttft_ms} max={maxTTFT} label="WITH DDN INFINIA" color="var(--nvidia-green)" />
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
            faster Time to First Token with DDN Infinia
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>GPU HBM: <strong>{summary.cold_ttft_ms.toLocaleString()} ms</strong></span>
            <span>DDN Infinia: <strong className="text-[var(--nvidia-green)]">{summary.warm_ttft_ms.toLocaleString()} ms</strong></span>
            <span>Context: <strong>{summary.tokens_in_context.toLocaleString()} tokens</strong> cached</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {summary.tokens_in_context.toLocaleString()} tokens never recomputed — retrieved via NIXL from DDN Infinia storage
          </div>
        </div>
      )}
    </div>
  )
}
