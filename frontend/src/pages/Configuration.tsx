import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Server, Sparkles, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { kvApi, InfiniaConfig } from '../services/api'

function FormField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field" />
    </div>
  )
}

export default function ConfigurationPage() {
  const [cfg, setCfg] = useState<InfiniaConfig>({
    endpoint_url: '', access_key: '', secret_key: '',
    bucket_name: 'ddn-kv-cache-01', region: 'us-east-1',
    ollama_url: 'http://localhost:11434', ollama_model: 'llama3.2:3b',
  })
  const [status, setStatus] = useState<{ connected: boolean; latency?: number } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; model_ready: boolean } | null>(null)

  // GPU Direct benchmark state
  const [gds, setGds] = useState({
    gds_bandwidth_gbps:      200,
    gds_latency_ms:          12,
    cpu_path_bandwidth_gbps: 18,
    gds_cpu_involvement_pct: 0,
    gds_platform:            'NVIDIA H100 SXM + DDN Infinia ES400NVX2',
    gds_source:              'DDN Infinia GPU Direct Storage benchmark',
    gds_source_url:          'https://www.ddn.com/blog/ddn-infinia-gpu-direct-storage/',
  })
  const [gdsSaving, setGdsSaving] = useState(false)

  useEffect(() => {
    kvApi.getConfig().then(d => {
      if (d.config_loaded) {
        setCfg(prev => ({ ...prev, endpoint_url: d.infinia_endpoint || '', bucket_name: d.infinia_bucket || 'ddn-kv-cache-01', region: d.infinia_region || 'us-east-1', ollama_url: d.ollama_url || 'http://localhost:11434', ollama_model: d.ollama_model || 'llama3.2:3b' }))
        setLoaded(true)
      }
    }).catch(() => {})
    kvApi.getHealth().then(d => setOllamaStatus({ available: d.ollama_available, model_ready: d.model_ready })).catch(() => {})
    // Load GPU Direct benchmark numbers
    kvApi.getGpuDirectReference().then(d => {
      if (d.gpu_direct) {
        setGds(prev => ({
          ...prev,
          gds_bandwidth_gbps:      d.gpu_direct.bandwidth_gbps      ?? prev.gds_bandwidth_gbps,
          gds_latency_ms:          d.gpu_direct.latency_ms          ?? prev.gds_latency_ms,
          cpu_path_bandwidth_gbps: d.cpu_path?.bandwidth_gbps       ?? prev.cpu_path_bandwidth_gbps,
          gds_cpu_involvement_pct: d.gpu_direct.cpu_involvement_pct ?? prev.gds_cpu_involvement_pct,
          gds_platform:            d.gpu_direct.platform            ?? prev.gds_platform,
          gds_source:              d.gpu_direct.source              ?? prev.gds_source,
          gds_source_url:          d.gpu_direct.source_url          ?? prev.gds_source_url,
        }))
      }
    }).catch(() => {})
  }, [])

  const handleSaveGds = async () => {
    setGdsSaving(true)
    try {
      await kvApi.updateGpuDirectBenchmarks(gds)
      toast.success('GPU Direct benchmark numbers saved')
    } catch { toast.error('Failed to save benchmark numbers') }
    finally { setGdsSaving(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try { await kvApi.saveConfig(cfg); toast.success('Configuration saved') }
    catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await kvApi.saveConfig(cfg)
      const r = await kvApi.testConfig(cfg)
      setStatus({ connected: r.success, latency: r.latency_ms })
      r.success ? toast.success(`Connected — ${r.latency_ms.toFixed(0)}ms`) : toast.error(r.message)
    } catch { toast.error('Connection test failed') }
    finally { setTesting(false) }
  }

  return (
    <div className="space-y-8">
      <div className="section-header">
        <h2 className="section-title">Storage & Model Configuration</h2>
        <p className="section-description">Configure DDN Infinia Object Store (KV Cache backend) and Ollama LLM runtime.</p>
      </div>

      {/* Status Bar */}
      <div className="toolbar justify-between">
        <div className="flex items-center gap-3">
          <div className={`status-dot ${status?.connected ? 'status-dot-success status-dot-pulse' : 'status-dot-error'}`} />
          <span className="text-sm font-medium text-neutral-900">DDN INFINIA</span>
          {status?.latency && <span className="text-xs text-neutral-500">{status.latency.toFixed(0)}ms</span>}
        </div>
        <button onClick={handleTest} disabled={testing} className="btn-primary">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Test Connection'}
        </button>
      </div>

      {/* Infinia Config */}
      <div className="card-elevated p-6 card-accent-ddn">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ddn-red/10">
              <Server className="w-5 h-5 text-ddn-red" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">DDN INFINIA — KV Cache Store</h3>
              <p className="text-xs text-neutral-500">High-performance S3-compatible object store for KV state</p>
            </div>
          </div>
          {status?.connected && <div className="badge badge-success"><CheckCircle className="w-3.5 h-3.5" />Connected</div>}
          {status !== null && !status.connected && <div className="badge badge-error"><XCircle className="w-3.5 h-3.5" />Failed</div>}
        </div>

        {loaded && (
          <div className="mb-4 flex items-center gap-2 p-2 rounded-lg text-sm" style={{ background: 'var(--status-info-subtle)', color: 'var(--status-info)' }}>
            <CheckCircle className="w-4 h-4" /> Configuration loaded from saved settings
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="Access Key" type="password" value={cfg.access_key} onChange={v => setCfg({ ...cfg, access_key: v })} placeholder="S3 access key" />
          <FormField label="Secret Key" type="password" value={cfg.secret_key} onChange={v => setCfg({ ...cfg, secret_key: v })} placeholder="S3 secret key" />
          <FormField label="Bucket Name" value={cfg.bucket_name} onChange={v => setCfg({ ...cfg, bucket_name: v })} placeholder="ddn-kv-cache-01" />
          <FormField label="Region" value={cfg.region} onChange={v => setCfg({ ...cfg, region: v })} placeholder="us-east-1" />
          <div className="md:col-span-2">
            <FormField label="Endpoint URL" value={cfg.endpoint_url} onChange={v => setCfg({ ...cfg, endpoint_url: v })} placeholder="https://192.168.147.129:8111" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Configuration'}
          </button>
          <button onClick={handleTest} disabled={testing} className="btn-secondary">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Test Connection'}
          </button>
        </div>

        {status !== null && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${status.connected ? 'badge-success' : 'badge-error'}`} style={{ padding: '10px 14px' }}>
            {status.connected ? <><CheckCircle className="w-4 h-4" />Connection verified — {status.latency?.toFixed(1)}ms latency</> : <><XCircle className="w-4 h-4" />Connection failed — check credentials and endpoint</>}
          </div>
        )}
      </div>

      {/* Ollama Config */}
      <div className="card-elevated p-6" style={{ borderTop: '3px solid #76B900' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(118,185,0,0.1)' }}>
              <Sparkles className="w-5 h-5 text-[#76B900]" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Ollama LLM Runtime</h3>
              <p className="text-xs text-neutral-500">Local inference engine — runs on your RTX GPU via WSL</p>
            </div>
          </div>
          {ollamaStatus?.model_ready && <div className="badge badge-nvidia"><CheckCircle className="w-3.5 h-3.5" />Model Ready</div>}
          {ollamaStatus && !ollamaStatus.model_ready && <div className="badge badge-info">{ollamaStatus.available ? 'Loading...' : 'Offline'}</div>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="Ollama URL" value={cfg.ollama_url} onChange={v => setCfg({ ...cfg, ollama_url: v })} placeholder="http://localhost:11434" />
          <FormField label="Model" value={cfg.ollama_model} onChange={v => setCfg({ ...cfg, ollama_model: v })} placeholder="llama3.2:3b" />
        </div>

        <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(118,185,0,0.08)', border: '1px solid rgba(118,185,0,0.2)' }}>
          <p className="text-xs font-medium" style={{ color: '#4a7a00' }}>
            💡 <strong>How it works:</strong> Ollama's <code className="font-mono bg-black/10 px-1 rounded">context</code> parameter stores the KV state token IDs after each generation.
            This KV state is persisted to DDN Infinia. On subsequent requests, we retrieve it and pass it back — Ollama reuses the cached state,
            sending only the new question tokens instead of the full system prompt.
          </p>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ background: '#76B900' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Model Configuration'}
          </button>
        </div>
      </div>

      {/* GPU Direct Benchmark Numbers */}
      <div className="card-elevated p-6" style={{ borderTop: '3px solid #00C280' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,194,128,0.1)' }}>
              <Zap className="w-5 h-5" style={{ color: '#00C280' }} />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">GPU Direct / RDMA — Benchmark Reference Numbers</h3>
              <p className="text-xs text-neutral-500">These numbers appear in the GPU Direct comparison panel after a GPU Memory Flush. Update them to match your actual hardware benchmark results.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(0,194,128,0.06)', border: '1px solid rgba(0,194,128,0.2)', color: '#047857' }}>
          <strong>ℹ️ How this works:</strong> The left column in the GPU Direct panel shows live CPU metrics captured during the actual S3 flush.
          The right column shows these reference numbers — labelled clearly as benchmark data. Update them here after running a GPU Direct benchmark on your target hardware.
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* GPU Direct path numbers */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#00C280' }}>With GPU Direct (Reference)</p>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Bandwidth (GB/s)</label>
              <input type="number" className="input-field" value={gds.gds_bandwidth_gbps}
                onChange={e => setGds({ ...gds, gds_bandwidth_gbps: parseFloat(e.target.value) || 0 })}
                placeholder="200" step="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Transfer Latency (ms)</label>
              <input type="number" className="input-field" value={gds.gds_latency_ms}
                onChange={e => setGds({ ...gds, gds_latency_ms: parseFloat(e.target.value) || 0 })}
                placeholder="12" step="0.1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">CPU Involvement (%)</label>
              <input type="number" className="input-field" value={gds.gds_cpu_involvement_pct}
                onChange={e => setGds({ ...gds, gds_cpu_involvement_pct: parseFloat(e.target.value) || 0 })}
                placeholder="0" step="1" min="0" max="100" />
            </div>
          </div>

          {/* CPU mediated path numbers */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#ED2738' }}>CPU-Mediated Path (Reference)</p>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">CPU Path Bandwidth (GB/s)</label>
              <input type="number" className="input-field" value={gds.cpu_path_bandwidth_gbps}
                onChange={e => setGds({ ...gds, cpu_path_bandwidth_gbps: parseFloat(e.target.value) || 0 })}
                placeholder="18" step="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Hardware Platform</label>
              <input type="text" className="input-field" value={gds.gds_platform}
                onChange={e => setGds({ ...gds, gds_platform: e.target.value })}
                placeholder="NVIDIA H100 SXM + DDN Infinia ES400NVX2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Source Label</label>
              <input type="text" className="input-field" value={gds.gds_source}
                onChange={e => setGds({ ...gds, gds_source: e.target.value })}
                placeholder="DDN Infinia GPU Direct Storage benchmark" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Source URL</label>
              <input type="url" className="input-field" value={gds.gds_source_url}
                onChange={e => setGds({ ...gds, gds_source_url: e.target.value })}
                placeholder="https://www.ddn.com/..." />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-neutral-100">
          <button onClick={handleSaveGds} disabled={gdsSaving} className="btn-primary" style={{ background: '#00C280' }}>
            {gdsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Benchmark Numbers'}
          </button>
          <span className="text-xs self-center" style={{ color: 'var(--text-muted)' }}>
            Numbers are saved to kv_config.json and reflected immediately in the Chat Observatory GPU Direct panel.
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Configuration Notes</h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {[
            'DDN INFINIA uses S3-compatible API with self-signed certificates (SSL verification disabled)',
            'KV cache objects stored under kvcache/ prefix in the ddn-kv-cache-01 bucket',
            'Ollama must be running in WSL (Ubuntu) on localhost:11434',
            'This app runs on port 8002 (BE) and 5176 (FE) — isolated from VSS:8001/5175 and RAG:8000/5174',
          ].map((note, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-ddn-red rounded-full mt-2 flex-shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
