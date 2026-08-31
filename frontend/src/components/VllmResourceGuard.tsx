import { useState, useEffect } from 'react'
import { AlertTriangle, Square, Zap, X, RefreshCw } from 'lucide-react'

type VllmStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'unknown'

interface VllmResourceGuardProps {
  /** Page name shown in the warning e.g. "Chat Observatory" */
  pageName: string
  /** How much GPU memory vLLM is consuming (shown in warning) */
  vllmMemoryGb?: number
}

/**
 * Smart GPU resource guard.
 * Add to any page that uses Ollama (Chat Observatory, Prefix Multiplier).
 * Auto-detects if vLLM is running, shows a warning, and offers a one-click stop.
 */
export default function VllmResourceGuard({ pageName, vllmMemoryGb = 14 }: VllmResourceGuardProps) {
  const [status, setStatus]             = useState<VllmStatus>('unknown')
  const [stopping, setStopping]         = useState(false)
  const [dismissed, setDismissed]       = useState(false)
  const [justStopped, setJustStopped]   = useState(false)

  const fetchStatus = async () => {
    try {
      const r = await fetch('/api/vllm/status')
      if (r.ok) {
        const d = await r.json()
        setStatus(d.status ?? 'unknown')
      }
    } catch {
      setStatus('unknown')
    }
  }

  // Check status on mount and poll every 5s
  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [])

  const stopVllm = async () => {
    setStopping(true)
    try {
      const r = await fetch('/api/vllm/stop', { method: 'POST' })
      if (r.ok) {
        setStatus('stopping')
        // Poll until vLLM actually stops
        const poll = setInterval(async () => {
          try {
            const s = await fetch('/api/vllm/status')
            const d = await s.json()
            setStatus(d.status)
            if (d.status === 'stopped' || d.status === 'error') {
              clearInterval(poll)
              setStopping(false)
              setJustStopped(true)
              setTimeout(() => setJustStopped(false), 6000)
            }
          } catch {
            clearInterval(poll)
          }
        }, 2000)
      }
    } catch {
      setStopping(false)
    }
  }

  const isRunning  = status === 'running' || status === 'starting'
  const isStopping = status === 'stopping' || stopping

  // ── Green success banner after vLLM stops ─────────────────────────────────
  if (justStopped && !isRunning) {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center gap-3 mb-4"
        style={{ background: 'rgba(118,185,0,0.10)', border: '1px solid rgba(118,185,0,0.3)' }}>
        <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#76B900' }} />
        <span className="text-sm font-medium" style={{ color: '#76B900' }}>
          ✓ vLLM stopped — GPU memory freed. {pageName} is ready.
        </span>
        <button onClick={() => setJustStopped(false)} className="ml-auto"
          style={{ color: '#76B900', opacity: 0.6 }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Don't render if vLLM is not running or user dismissed
  if ((!isRunning && !isStopping) || dismissed) return null

  // ── Warning banner ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl overflow-hidden mb-4"
      style={{ border: '1.5px solid rgba(237,39,56,0.5)', background: 'rgba(237,39,56,0.06)' }}>

      {/* Header bar */}
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'rgba(237,39,56,0.10)', borderBottom: '1px solid rgba(237,39,56,0.15)' }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ED2738' }} />
        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: '#ED2738' }}>
          GPU Memory Conflict Detected
        </span>
        <button onClick={() => setDismissed(true)} className="ml-auto opacity-50 hover:opacity-100"
          title="Dismiss">
          <X className="w-3.5 h-3.5" style={{ color: '#ED2738' }} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isStopping ? (
              <span style={{ color: '#FF7600' }}>vLLM is stopping — freeing GPU memory…</span>
            ) : (
              <>vLLM is <span style={{ color: '#ED2738' }}>
                running and consuming ~{vllmMemoryGb} GB of GPU memory
              </span></>
            )}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <strong>{pageName}</strong> uses <strong>Ollama</strong> (not vLLM). While vLLM is active,
            Ollama may not get enough GPU memory and the system can hang or crash during inference.
            Stop vLLM first to free the GPU for Ollama.
          </p>
          <div className="flex flex-wrap gap-4 mt-1.5" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>🔴 vLLM (port 11000) — ~{vllmMemoryGb} GB GPU</span>
            <span>🟢 Ollama (port 11434) — needs ~6 GB free</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={stopVllm}
            disabled={isStopping}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: isStopping ? 'var(--surface-secondary)' : '#ED2738',
              color: isStopping ? 'var(--text-muted)' : '#fff',
              cursor: isStopping ? 'not-allowed' : 'pointer',
              boxShadow: isStopping ? 'none' : '0 2px 8px rgba(237,39,56,0.35)',
              minWidth: 175,
            }}
          >
            {isStopping ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" />&nbsp;Stopping vLLM…</>
            ) : (
              <><Square className="w-3.5 h-3.5" />&nbsp;Stop vLLM &amp; Free GPU</>
            )}
          </button>

          {!isStopping && (
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-center px-4 py-1.5 rounded-lg transition-all"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              Continue anyway (risk hang)
            </button>
          )}
        </div>
      </div>

      {/* Progress bar while stopping */}
      {isStopping && (
        <div className="px-4 pb-3">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
            <div className="h-full rounded-full animate-pulse"
              style={{ width: '60%', background: '#FF7600' }} />
          </div>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Stopping vLLM process — GPU memory will be freed in ~5–10 seconds
          </p>
        </div>
      )}
    </div>
  )
}
