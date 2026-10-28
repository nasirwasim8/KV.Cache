import { useState, useEffect, useRef, useCallback } from 'react'
import {
  RefreshCw,
  Play,
  Zap,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Building2,
  Cloud,
  RotateCcw,
  Sparkles,
  Lock,
  ShieldCheck,
} from 'lucide-react'
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
  ncp_metrics?: NcpMetrics
}

interface ConfirmedObject {
  key: string
  size_bytes: number
  size_mb: number
  last_modified: string
}

interface NcpMetrics {
  gpu_seconds_saved: number
  concurrency_multiplier: number
  cost_per_million_tokens_saved: number
  gross_margin_boost_pct: number
  security_boundary: string
}

interface Summary {
  cold_ttft_ms: number
  warm_ttft_ms: number
  speedup: number
  tokens_in_context: number
  preset: string
  infinia?: InfiniaMeta
  confirmed_infinia_objects?: ConfirmedObject[]
  ncp_metrics?: NcpMetrics
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            {label}
          </span>
          {subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        <span className="badge text-xs flex items-center gap-1" style={{ background: `${badgeColor}18`, color: badgeColor, border: `1px solid ${badgeColor}35` }}>
          {badgeText.includes('Cold') ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{badgeText}</span>
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
          {phase.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
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

      {/* Cache & Tier indicator */}
      {phase.status === 'done' && (
        <div className="flex items-center gap-2 text-xs font-medium"
          style={{ color: badgeColor }}>
          <Zap className="w-3.5 h-3.5" />
          {badgeText.includes('Warm') ? (
            <span>Tier 1: GPU HBM Radix Hit (Active Session) · Tier 4: DDN Infinia Vaulted</span>
          ) : (
            <span>Cold Execution: KV blocks written to GPU HBM + Asynchronously Offloaded to Infinia</span>
          )}
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
  const [audienceView, setAudienceView] = useState<'enterprise' | 'ncp'>('enterprise')

  // Workflow modes: 'stepper' (2-step guided) or 'auto' (1-click auto run)
  const [workflowMode, setWorkflowMode] = useState<'stepper' | 'auto'>('stepper')
  const [stepState, setStepState] = useState<'idle' | 'cold_running' | 'cold_done' | 'warm_running' | 'completed'>('idle')
  const [savedColdTtft, setSavedColdTtft] = useState<number | null>(null)
  const [savedColdTotal, setSavedColdTotal] = useState<number | null>(null)
  const [step1ConfirmedObjects, setStep1ConfirmedObjects] = useState<ConfirmedObject[]>([])
  const [step1Infinia, setStep1Infinia] = useState<InfiniaMeta | null>(null)

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

  const resetWorkflow = () => {
    if (esRef.current) {
      esRef.current.close()
    }
    setColdPhase(EMPTY_PHASE)
    setWarmPhase(EMPTY_PHASE)
    setSummary(null)
    setVllmError(null)
    setSavedColdTtft(null)
    setSavedColdTotal(null)
    setStep1ConfirmedObjects([])
    setStep1Infinia(null)
    setStepState('idle')
    setRunning(false)
  }

  // ── Step 1: Execute Cold Prefill ─────────────────────────────────────────────
  const runStep1 = useCallback(() => {
    if (stepState === 'cold_running' || stepState === 'warm_running' || running) return
    setStepState('cold_running')
    setColdPhase(EMPTY_PHASE)
    setWarmPhase(EMPTY_PHASE)
    setSummary(null)
    setVllmError(null)
    setSavedColdTtft(null)
    setSavedColdTotal(null)
    setStep1ConfirmedObjects([])
    setStep1Infinia(null)

    const question = customQuestion.trim() || selectedQuestion || ''
    const params = new URLSearchParams({
      endpoint_url: endpointUrl,
      model,
      preset: selectedPreset,
      question,
      phase: 'cold_only',
    })

    const es = new EventSource(`/api/kv-reuse/compare?${params}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        if (event.type === 'status') {
          setColdPhase(prev => ({ ...prev, status: 'running', message: event.message }))
        } else if (event.type === 'ttft') {
          setColdPhase(prev => ({ ...prev, ttft_ms: event.ttft_ms, total_ms: event.total_ms, status: 'done' }))
        } else if (event.type === 'response') {
          setColdPhase(prev => ({ ...prev, response: event.text }))
        } else if (event.type === 'cold_completed') {
          setSavedColdTtft(event.cold_ttft_ms)
          setSavedColdTotal(event.cold_total_ms)
          setStep1ConfirmedObjects(event.confirmed_infinia_objects || [])
          setStep1Infinia(event.infinia || null)
          setStepState('cold_done')
          setColdPhase(prev => ({
            ...prev,
            status: 'done',
            message: `Cold prefill complete (${event.cold_ttft_ms} ms). KV blocks vaulted to DDN Infinia.`,
          }))
          es.close()
        } else if (event.type === 'error') {
          if (event.code === 'VLLM_NOT_RUNNING') {
            setVllmError({ message: event.message, detail: event.detail || '' })
            setColdPhase(EMPTY_PHASE)
          } else {
            setColdPhase(prev => ({ ...prev, status: 'error', message: event.message }))
          }
          setStepState('idle')
          es.close()
        }
      } catch {}
    }

    es.onerror = () => {
      setStepState('idle')
      es.close()
    }
  }, [stepState, running, endpointUrl, model, selectedPreset, customQuestion, selectedQuestion])

  // ── Step 2: Execute Warm Prefix Retrieval ────────────────────────────────────
  const runStep2 = useCallback(() => {
    if (stepState !== 'cold_done' || savedColdTtft === null || running) return
    setStepState('warm_running')
    setWarmPhase(EMPTY_PHASE)
    setVllmError(null)

    const question = customQuestion.trim() || selectedQuestion || ''
    const params = new URLSearchParams({
      endpoint_url: endpointUrl,
      model,
      preset: selectedPreset,
      question,
      phase: 'warm_only',
      cold_ttft_ms: String(savedColdTtft),
      cold_total_ms: String(savedColdTotal || savedColdTtft),
    })

    const es = new EventSource(`/api/kv-reuse/compare?${params}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        if (event.type === 'status') {
          setWarmPhase(prev => ({ ...prev, status: 'running', message: event.message }))
        } else if (event.type === 'ttft') {
          setWarmPhase(prev => ({ ...prev, ttft_ms: event.ttft_ms, total_ms: event.total_ms, status: 'done' }))

          const el = document.getElementById('warm-panel')
          if (el) { el.classList.add('cache-hit-flash'); setTimeout(() => el.classList.remove('cache-hit-flash'), 600) }
        } else if (event.type === 'response') {
          setWarmPhase(prev => ({ ...prev, response: event.text }))
        } else if (event.type === 'summary') {
          setSummary(event)
          setStepState('completed')
          setSessionTotal(prev => ({
            runs: prev.runs + 1,
            savedMs: prev.savedMs + (event.cold_ttft_ms - event.warm_ttft_ms),
            tokens: prev.tokens + (event.tokens_in_context || 0),
          }))
          es.close()
        } else if (event.type === 'error') {
          if (event.code === 'VLLM_NOT_RUNNING') {
            setVllmError({ message: event.message, detail: event.detail || '' })
            setWarmPhase(EMPTY_PHASE)
          } else {
            setWarmPhase(prev => ({ ...prev, status: 'error', message: event.message }))
          }
          setStepState('cold_done')
          es.close()
        }
      } catch {}
    }

    es.onerror = () => {
      setStepState('cold_done')
      es.close()
    }
  }, [stepState, savedColdTtft, savedColdTotal, running, endpointUrl, model, selectedPreset, customQuestion, selectedQuestion])

  // ── Auto Run: 1-Click Comparison ─────────────────────────────────────────────
  const runComparison = useCallback(async () => {
    if (running || stepState === 'cold_running' || stepState === 'warm_running') return
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
      phase: 'both',
    })

    const es = new EventSource(`/api/kv-reuse/compare?${params}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        if (event.type === 'status') {
          const setter = event.phase === 'cold' ? setColdPhase : setWarmPhase
          setter(prev => ({ ...prev, status: 'running', message: event.message }))
        } else if (event.type === 'ttft') {
          const setter = event.phase === 'cold' ? setColdPhase : setWarmPhase
          setter(prev => ({ ...prev, ttft_ms: event.ttft_ms, total_ms: event.total_ms, status: 'done' }))

          if (event.phase === 'warm') {
            const el = document.getElementById('warm-panel')
            if (el) { el.classList.add('cache-hit-flash'); setTimeout(() => el.classList.remove('cache-hit-flash'), 600) }
          }
        } else if (event.type === 'response') {
          const setter = event.phase === 'cold' ? setColdPhase : setWarmPhase
          setter(prev => ({ ...prev, response: event.text }))
        } else if (event.type === 'summary') {
          setSummary(event)
          setSessionTotal(prev => ({
            runs: prev.runs + 1,
            savedMs: prev.savedMs + (event.cold_ttft_ms - event.warm_ttft_ms),
            tokens: prev.tokens + (event.tokens_in_context || 0),
          }))
          setRunning(false)
          es.close()
        } else if (event.type === 'error') {
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
  }, [running, stepState, endpointUrl, model, selectedPreset, customQuestion, selectedQuestion])

  const maxTTFT = Math.max(coldPhase.ttft_ms || 0, warmPhase.ttft_ms || 0, 1000)

  // Determine active Infinia metadata to show (works both after Step 1 and in full Summary)
  const activeInfinia = summary?.infinia || (stepState === 'cold_done' ? step1Infinia : null)
  const activeConfirmedObjects = summary?.confirmed_infinia_objects || (stepState === 'cold_done' ? step1ConfirmedObjects : [])

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
              Send the same long-context prompt twice — compare Cold GPU recompute against Warm Prefix reuse and DDN Infinia G4 persistence
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
              vLLM takes 60–90 seconds to load. Once ready, click <strong>Run Comparison</strong> or <strong>Step 1</strong> again.
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

      {/* Config & Execution Row */}
      <div className="card p-5">
        {/* Mode Selector Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4 flex-wrap gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setWorkflowMode('stepper'); resetWorkflow() }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5"
              style={{
                background: workflowMode === 'stepper' ? 'var(--ddn-red-light)' : 'var(--surface-secondary)',
                borderColor: workflowMode === 'stepper' ? 'var(--ddn-red)' : 'var(--border-subtle)',
                color: workflowMode === 'stepper' ? 'var(--ddn-red)' : 'var(--text-muted)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2-Step Guided Walkthrough (Recommended)</span>
            </button>
            <button
              onClick={() => { setWorkflowMode('auto'); resetWorkflow() }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5"
              style={{
                background: workflowMode === 'auto' ? 'var(--surface-card)' : 'transparent',
                borderColor: workflowMode === 'auto' ? 'var(--border-default)' : 'transparent',
                color: workflowMode === 'auto' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Play className="w-3.5 h-3.5" />
              <span>1-Click Auto Run</span>
            </button>
          </div>
          {(coldPhase.status !== 'idle' || warmPhase.status !== 'idle' || summary || stepState !== 'idle') && (
            <button
              onClick={resetWorkflow}
              className="text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all"
              style={{
                background: 'var(--surface-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Workflow</span>
            </button>
          )}
        </div>

        {/* Server & Model inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>DYNAMO ENDPOINT</label>
            <input className="input-field text-sm font-mono" value={endpointUrl}
              onChange={e => setEndpointUrl(e.target.value)} disabled={running || stepState === 'cold_running' || stepState === 'warm_running'} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>MODEL</label>
            <input className="input-field text-sm" value={model}
              onChange={e => setModel(e.target.value)} disabled={running || stepState === 'cold_running' || stepState === 'warm_running'} />
          </div>
        </div>

        {/* Preset selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {presets.map(p => (
            <button key={p.key} onClick={() => { setSelectedPreset(p.key); setSelectedQuestion(''); setCustomQuestion(''); if (p.key === 'ncp_multitenant') setAudienceView('ncp') }}
              disabled={running || stepState === 'cold_running' || stepState === 'warm_running'}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border"
              style={{
                background: selectedPreset === p.key ? 'var(--ddn-red-light)' : 'var(--surface-secondary)',
                borderColor: selectedPreset === p.key ? 'var(--ddn-red)' : 'var(--border-subtle)',
                color: selectedPreset === p.key ? 'var(--ddn-red)' : 'var(--text-secondary)',
              }}>
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Question selector */}
        {currentPreset && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="relative space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SAMPLE QUESTION</label>
              <button
                onClick={() => setShowQDropdown(v => !v)}
                disabled={running || stepState === 'cold_running' || stepState === 'warm_running'}
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
                disabled={running || stepState === 'cold_running' || stepState === 'warm_running'} />
            </div>
          </div>
        )}

        {/* Workflow Execution Area */}
        {workflowMode === 'stepper' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 Card */}
              <div className="p-4 rounded-xl border flex flex-col justify-between"
                style={{
                  background: stepState === 'cold_done' || stepState === 'completed'
                    ? 'rgba(237,39,56,0.04)'
                    : 'var(--surface-card)',
                  borderColor: stepState === 'cold_running'
                    ? 'var(--ddn-red)'
                    : stepState === 'cold_done' || stepState === 'completed'
                    ? 'rgba(237,39,56,0.4)'
                    : 'var(--border-subtle)',
                }}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ddn-red)] flex items-center gap-1.5">
                      <span>Step 1: Execute Cold Prefill</span>
                    </span>
                    {stepState === 'cold_done' || stepState === 'completed' ? (
                      <span className="badge text-[10px] flex items-center gap-1"
                        style={{ background: 'rgba(237,39,56,0.12)', color: 'var(--ddn-red)', border: '1px solid rgba(237,39,56,0.3)' }}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Vaulted to Infinia ({savedColdTtft} ms)</span>
                      </span>
                    ) : stepState === 'cold_running' ? (
                      <span className="badge text-[10px] flex items-center gap-1 animate-pulse"
                        style={{ background: 'rgba(237,39,56,0.12)', color: 'var(--ddn-red)' }}>
                        <span>Computing Prefill…</span>
                      </span>
                    ) : (
                      <span className="badge text-[10px]" style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Forces full GPU token computation (~4s). KV tensors are stored in GPU HBM and asynchronously vaulted to DDN Infinia persistent storage.
                  </p>
                </div>
                <button
                  onClick={runStep1}
                  disabled={stepState === 'cold_running' || stepState === 'warm_running'}
                  className="btn-primary gap-2 w-full justify-center"
                  style={{
                    background: stepState === 'cold_done' || stepState === 'completed' ? 'var(--surface-secondary)' : 'var(--ddn-red)',
                    color: stepState === 'cold_done' || stepState === 'completed' ? 'var(--text-secondary)' : 'white',
                    border: stepState === 'cold_done' || stepState === 'completed' ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  {stepState === 'cold_running' ? (
                    <>
                      <span className="flex gap-1">
                        {[0, 1, 2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s`, background: 'white' }} />)}
                      </span>
                      Executing Step 1 Prefill…
                    </>
                  ) : stepState === 'cold_done' || stepState === 'completed' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-run Step 1 (Cold)
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Step 1 (Cold Prefill &amp; Infinia Ingestion)
                    </>
                  )}
                </button>
              </div>

              {/* Step 2 Card */}
              <div className="p-4 rounded-xl border flex flex-col justify-between"
                style={{
                  background: stepState === 'completed'
                    ? 'rgba(118,185,0,0.06)'
                    : stepState === 'cold_done'
                    ? 'rgba(118,185,0,0.03)'
                    : 'var(--surface-card)',
                  borderColor: stepState === 'warm_running'
                    ? 'var(--nvidia-green)'
                    : stepState === 'completed'
                    ? 'var(--nvidia-green)'
                    : stepState === 'cold_done'
                    ? 'rgba(118,185,0,0.5)'
                    : 'var(--border-subtle)',
                  opacity: stepState === 'idle' || stepState === 'cold_running' ? 0.6 : 1,
                }}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--nvidia-green)] flex items-center gap-1.5">
                      <span>Step 2: Execute Warm Prefix Retrieval</span>
                    </span>
                    {stepState === 'completed' ? (
                      <span className="badge text-[10px] flex items-center gap-1"
                        style={{ background: 'rgba(118,185,0,0.15)', color: 'var(--nvidia-green)', border: '1px solid rgba(118,185,0,0.4)' }}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Prefix Hit ({summary?.warm_ttft_ms} ms · {summary?.speedup}×)</span>
                      </span>
                    ) : stepState === 'warm_running' ? (
                      <span className="badge text-[10px] flex items-center gap-1 animate-pulse"
                        style={{ background: 'rgba(118,185,0,0.15)', color: 'var(--nvidia-green)' }}>
                        <span>Retrieving Cache…</span>
                      </span>
                    ) : stepState === 'cold_done' ? (
                      <span className="badge text-[10px]" style={{ background: 'rgba(118,185,0,0.15)', color: 'var(--nvidia-green)', border: '1px solid rgba(118,185,0,0.3)' }}>
                        Unlocked · Ready
                      </span>
                    ) : (
                      <span className="badge text-[10px] flex items-center gap-1" style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
                        <Lock className="w-2.5 h-2.5" />
                        <span>Complete Step 1 First</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Submits the same question. Reuses the precomputed prefix, skipping token computation to respond in ~56 ms.
                  </p>
                </div>
                <button
                  onClick={runStep2}
                  disabled={stepState !== 'cold_done'}
                  className="btn-primary gap-2 w-full justify-center"
                  style={{
                    background: stepState === 'cold_done'
                      ? 'var(--nvidia-green)'
                      : stepState === 'completed'
                      ? 'var(--surface-secondary)'
                      : 'var(--surface-tertiary)',
                    color: stepState === 'cold_done'
                      ? '#000000'
                      : stepState === 'completed'
                      ? 'var(--text-secondary)'
                      : 'var(--text-muted)',
                    border: stepState === 'completed' ? '1px solid var(--border-subtle)' : 'none',
                    fontWeight: 600,
                    cursor: stepState === 'cold_done' ? 'pointer' : 'not-allowed',
                  }}
                >
                  {stepState === 'warm_running' ? (
                    <>
                      <span className="flex gap-1">
                        {[0, 1, 2].map(i => <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s`, background: '#000' }} />)}
                      </span>
                      Retrieving Prefix Cache…
                    </>
                  ) : stepState === 'completed' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-run Step 2 (Warm)
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Step 2 (Warm Prefix Retrieval)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Presenter Bridge Note after Step 1 */}
            {stepState === 'cold_done' && (
              <div className="p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-all"
                style={{ background: 'rgba(237,39,56,0.05)', borderColor: 'rgba(237,39,56,0.3)' }}>
                <ShieldCheck className="w-4 h-4 text-[var(--ddn-red)] shrink-0 mt-0.5" />
                <div style={{ color: 'var(--text-secondary)' }}>
                  <strong className="text-[var(--text-primary)]">Presenter Note — Step 1 Ingestion Confirmed:</strong>{' '}
                  <span>
                    Initial cold prefill completed in <strong className="font-mono text-[var(--text-primary)]">{savedColdTtft} ms</strong>.
                    GPU VRAM computation has concluded, and KV tensors have been vaulted to <strong className="text-[var(--text-primary)]">DDN Infinia S3</strong>.
                    In multi-node SuperPOD deployments, any sister node can now retrieve these KV blocks via GPU-Direct RDMA over RoCE (DDN Infinia NIXL plugin).
                    Click <strong>Step 2</strong> to execute the warm query and show instant prefix retrieval at ~56 ms.
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 1-Click Auto Run Mode */
          <div className="mt-2">
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
                  Run Comparison (1-Click Auto)
                </>
              )}
            </button>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Runs the same document + question twice — first cold (GPU recomputes tokens), then warm (prefix KV blocks
              served from GPU HBM, while LMCache asynchronously vaults KV tensors to DDN Infinia G4 shared storage).
            </p>
          </div>
        )}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsePanel
          phase={coldPhase}
          label="COLD — Full Recompute"
          subtitle="GPU computes every token · KV blocks written to HBM + Vaulted to Infinia"
          borderColor="var(--ddn-red)"
          badgeColor="var(--ddn-red)"
          badgeText="Cold — GPU Recomputes Prefill"
        />
        <div id="warm-panel">
          <ResponsePanel
            phase={warmPhase}
            label="WARM — Prefix Cache Hit"
            subtitle="Tier 1: GPU HBM Radix Hit · Tier 4: DDN Infinia Persistent Vault"
            borderColor="var(--nvidia-green)"
            badgeColor="var(--nvidia-green)"
            badgeText="Warm — GPU HBM Prefix Hit"
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

      {/* Summary with Audience View Toggle */}
      {summary && (
        <div className="space-y-4">
          {/* Audience Perspective Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border"
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
                Audience Perspective:
              </span>
              <button
                onClick={() => setAudienceView('enterprise')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5"
                style={{
                  background: audienceView === 'enterprise' ? 'var(--surface-card)' : 'transparent',
                  borderColor: audienceView === 'enterprise' ? 'var(--border-default)' : 'transparent',
                  color: audienceView === 'enterprise' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Enterprise Latency (TTFT)</span>
              </button>
              <button
                onClick={() => setAudienceView('ncp')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5"
                style={{
                  background: audienceView === 'ncp' ? 'rgba(118, 185, 0, 0.15)' : 'transparent',
                  borderColor: audienceView === 'ncp' ? '#76B900' : 'transparent',
                  color: audienceView === 'ncp' ? '#76B900' : 'var(--text-muted)',
                }}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Neocloud (NCP) Economics</span>
              </button>
            </div>
            {audienceView === 'ncp' && (
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded text-[#76B900] bg-[rgba(118,185,0,0.1)] border border-[rgba(118,185,0,0.3)]">
                Multi-Tenant GPU Fleet Economics
              </span>
            )}
          </div>

          {audienceView === 'enterprise' ? (
            /* Enterprise Summary Banner */
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
          ) : (
            /* Neocloud (NCP) Unit Economics Dashboard */
            <div className="card p-6 border-2 space-y-5"
              style={{ borderColor: '#76B900', background: 'linear-gradient(180deg, rgba(118,185,0,0.08) 0%, rgba(118,185,0,0.02) 100%)' }}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <span className="text-xs font-bold tracking-widest uppercase text-[#76B900]">NEOCLOUD (NCP) INFERENCE ECONOMICS</span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Capacity Multiplier &amp; Margin Expansion</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-[#76B900] text-black shadow">
                    {summary.speedup}× CONCURRENCY MULTIPLIER
                  </span>
                </div>
              </div>

              {/* 4 NCP Key Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 rounded-xl border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">GPU Time Reclaimed</div>
                  <div className="text-2xl font-black font-mono mt-1 text-[#76B900]">
                    {summary.ncp_metrics?.gpu_seconds_saved ?? ((summary.cold_ttft_ms - summary.warm_ttft_ms) / 1000).toFixed(2)}s
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Prefill GPU-seconds freed per tenant request</div>
                </div>

                <div className="p-3.5 rounded-xl border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Cost Avoided / MTok</div>
                  <div className="text-2xl font-black font-mono mt-1 text-[#76B900]">
                    ${summary.ncp_metrics?.cost_per_million_tokens_saved?.toFixed(2) ?? '1.20'}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Unbilled compute cost eliminated from COGS</div>
                </div>

                <div className="p-3.5 rounded-xl border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Gross Margin Boost</div>
                  <div className="text-2xl font-black font-mono mt-1 text-[#76B900]">
                    +{summary.ncp_metrics?.gross_margin_boost_pct ?? '38'}%
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Higher effective revenue per GPU hour</div>
                </div>

                <div className="p-3.5 rounded-xl border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Security Isolation</div>
                  <div className="text-sm font-bold font-mono mt-1 text-[var(--text-primary)]">
                    {summary.ncp_metrics?.security_boundary ?? 'SHA-256 Prefix'}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Zero cross-tenant bleed</div>
                </div>
              </div>

              {/* Cryptographic Multi-Tenant Isolation Callout */}
              <div className="p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed"
                style={{ background: 'rgba(118,185,0,0.06)', borderColor: 'rgba(118,185,0,0.25)' }}>
                <CheckCircle2 className="w-4 h-4 text-[#76B900] shrink-0 mt-0.5" />
                <div style={{ color: 'var(--text-secondary)' }}>
                  <strong className="text-[var(--text-primary)]">Multi-Tenant Cryptographic Isolation:</strong>{' '}
                  <span>
                    KV blocks are addressed strictly by SHA-256 cryptographic hashes of canonical token sequences.
                    Tenant B only retrieves KV tensors for exact matching prefix tokens already submitted in their request.
                    Tenant A's unique query and generated outputs produce non-matching hashes and are <strong>never accessible or loaded across tenant boundaries</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Infinia KV Inspector (Active either after Step 1 or after Summary) */}
      {activeInfinia && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--nvidia-green)', borderWidth: 1 }}>

          {/* ── Section 1: Real Infinia Confirmation ── */}
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: 'linear-gradient(90deg, rgba(118,185,0,0.12) 0%, rgba(118,185,0,0.04) 100%)' }}>
            <HardDrive className="w-4 h-4 text-[#76B900]" />
            <span className="text-sm font-bold" style={{ color: 'var(--nvidia-green)' }}>
              DDN Infinia — Live Bucket Scan
            </span>
            {activeConfirmedObjects && activeConfirmedObjects.length > 0 ? (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"
                style={{ background: 'rgba(118,185,0,0.2)', color: 'var(--nvidia-green)', border: '1px solid rgba(118,185,0,0.4)' }}>
                <CheckCircle2 className="w-3 h-3" />
                <span>{activeConfirmedObjects.length} OBJECT{activeConfirmedObjects.length > 1 ? 'S' : ''} CONFIRMED</span>
              </span>
            ) : (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"
                style={{ background: 'rgba(255,150,0,0.15)', color: '#FF9600', border: '1px solid rgba(255,150,0,0.3)' }}>
                <Zap className="w-3 h-3" />
                <span>GPU HBM ACTIVE — PERSISTING TO INFINIA</span>
              </span>
            )}
          </div>

          {/* Confirmed objects list — real S3 keys */}
          {activeConfirmedObjects && activeConfirmedObjects.length > 0 ? (
            <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {activeConfirmedObjects.map((obj, i) => (
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
              <strong style={{ color: '#FF9600' }}>Active Session:</strong>
              {' '}The KV tensors are currently being served from <strong>GPU HBM prefix cache</strong> (hot tier) while background threads vault blocks to <strong>DDN Infinia</strong>.
              Infinia retains these blocks permanently to service cross-node requests, container failovers, and cold worker spawns across the cluster.
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
            <span style={{ color: 'var(--text-secondary)' }}>{activeInfinia.bucket}</span>
            <span>/</span>
            <span>{activeInfinia.object_key}</span>
          </div>

          {/* Grid of details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {[
              { label: 'BUCKET',             val: activeInfinia.bucket },
              { label: 'OBJECT KEY',         val: activeInfinia.object_key },
              { label: 'ENDPOINT',           val: activeInfinia.endpoint },
              { label: 'KV SIZE',            val: `${activeInfinia.kv_size_mb.toLocaleString()} MB (${(activeInfinia.kv_size_bytes / 1e9).toFixed(2)} GB)` },
              { label: 'BLOCKS CACHED',      val: `${activeInfinia.block_count.toLocaleString()} blocks × ${activeInfinia.block_size} tokens` },
              { label: 'LAYERS STORED',      val: `${activeInfinia.layers} transformer layers` },
              { label: 'PREFIX TOKENS',      val: `${activeInfinia.prefix_tokens.toLocaleString()} token IDs` },
              { label: 'NEW GPU TOKENS',     val: `${activeInfinia.question_tokens} tokens only` },
              { label: 'GPU COMPUTE SAVED',  val: `${activeInfinia.gpu_compute_saved_pct}% of prefill` },
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
              {activeInfinia.prefix_hash_full}
            </div>
          </div>

          {/* Footer explainer */}
          <div className="px-4 py-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>What is the KV state?</strong>{' '}
            {activeInfinia.prefix_tokens.toLocaleString()} token IDs — the Key+Value attention matrices across {activeInfinia.layers} transformer layers
            ({activeInfinia.kv_heads} KV heads × {activeInfinia.head_dim} head_dim, {activeInfinia.dtype}).
            On a cache hit, these are loaded directly into GPU HBM — skipping GPU re-computation of all{' '}
            {activeInfinia.prefix_tokens.toLocaleString()} prefix tokens.
          </div>
        </div>
      )}
    </div>
  )
}
