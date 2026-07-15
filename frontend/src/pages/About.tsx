import { Database, Zap, DollarSign, Users, ChevronRight } from 'lucide-react'

function ArchBox({ label, sublabel, color, icon: Icon }: { label: string; sublabel?: string; color: string; icon?: any }) {
  return (
    <div className="p-3 rounded-xl border text-center" style={{ borderColor: color, background: `${color}10` }}>
      {Icon && <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />}
      <div className="text-xs font-bold" style={{ color }}>{label}</div>
      {sublabel && <div className="text-xs text-neutral-500 mt-0.5">{sublabel}</div>}
    </div>
  )
}

export default function About() {
  const icps = [
    { role: 'MLOps / Infra Engineers', concern: 'GPU utilization & cost', benefit: 'Direct proof of fewer GPU cycles per request', icon: '⚙️' },
    { role: 'CTOs / VP Engineering', concern: 'Infrastructure budget', benefit: 'Monthly & annual $ savings at scale', icon: '💼' },
    { role: 'AI Product Managers', concern: 'Latency & user experience', benefit: 'Sub-100ms TTFT on repeated queries', icon: '🚀' },
    { role: 'Finance / Procurement', concern: 'Cloud vs on-prem ROI', benefit: 'Hard numbers: cost per request with/without', icon: '📊' },
    { role: 'AI Researchers', concern: 'Token efficiency', benefit: 'Real token reduction measurement', icon: '🔬' },
  ]

  return (
    <div className="space-y-8">
      <div className="section-header">
        <h2 className="section-title">Architecture & How It Works</h2>
        <p className="section-description">DDN Infinia as the KV Cache Object Store — the full technical picture.</p>
      </div>

      {/* Architecture Diagram */}
      <div className="card-elevated p-6 card-accent-ddn">
        <h3 className="font-semibold text-neutral-900 mb-5">System Architecture</h3>
        <div className="space-y-4">
          {/* Browser layer */}
          <div className="grid grid-cols-2 gap-4">
            <ArchBox label="React Frontend" sublabel="localhost:5176" color="#1A81AF" icon={Zap} />
            <ArchBox label="FastAPI Backend" sublabel="localhost:8002" color="#ED2738" icon={Zap} />
          </div>
          <div className="flex justify-center"><ChevronRight className="w-5 h-5 text-neutral-400 rotate-90" /></div>
          {/* Middle layer */}
          <div className="grid grid-cols-3 gap-4">
            <ArchBox label="InfiniaKVCacheManager" sublabel="boto3 S3 client" color="#ED2738" />
            <ArchBox label="OllamaClient" sublabel="/api/generate + context" color="#76B900" />
            <ArchBox label="Session Store" sublabel="in-memory dict" color="#807778" />
          </div>
          <div className="flex justify-center"><ChevronRight className="w-5 h-5 text-neutral-400 rotate-90" /></div>
          {/* Bottom layer */}
          <div className="grid grid-cols-2 gap-4">
            <ArchBox label="DDN INFINIA Object Store" sublabel="kvcache/*.json — real S3 GET/PUT" color="#ED2738" icon={Database} />
            <ArchBox label="Ollama + RTX 5090" sublabel="llama3.2:3b via WSL" color="#76B900" icon={Zap} />
          </div>
        </div>
      </div>

      {/* What makes this real */}
      <div className="card p-6">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><span className="text-xl">✅</span> Why This Demo Is Real (Not Simulated)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Real S3 Operations', desc: 'Every cache hit is an actual boto3 GET request to DDN Infinia. The latency shown is measured millisecond-by-millisecond.' },
            { title: 'Real Token Reduction', desc: "When cache hits: we send only the new message tokens to Ollama, not the full history. Fewer tokens = faster prefill = genuine speedup." },
            { title: 'Real Ollama KV Reuse', desc: "The Ollama 'context' parameter returns KV state token IDs. We store these in Infinia and pass them back — Ollama's internal cache reuses them." },
            { title: 'Real Cost Calculation', desc: 'GPU cost calculated from actual TTFT × H100 market rate. Infinia cost from real S3 pricing. The delta IS the saving.' },
          ].map(item => (
            <div key={item.title} className="p-4 rounded-xl" style={{ background: 'rgba(0,194,128,0.06)', border: '1px solid rgba(0,194,128,0.2)' }}>
              <div className="font-semibold text-sm text-neutral-900 mb-1">{item.title}</div>
              <div className="text-xs text-neutral-600">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ICP section */}
      <div className="card p-6">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-ddn-red" /> Ideal Customer Profiles</h3>
        <div className="space-y-3">
          {icps.map(icp => (
            <div key={icp.role} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
              <span className="text-2xl">{icp.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-neutral-900">{icp.role}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Cares about: {icp.concern}</div>
              </div>
              <div className="text-xs text-right" style={{ color: 'var(--status-success)', maxWidth: '200px' }}>{icp.benefit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Port isolation notice */}
      <div className="card p-5" style={{ borderLeft: '3px solid #FF7600' }}>
        <h4 className="font-semibold text-sm mb-2" style={{ color: '#FF7600' }}>⚠️ Port Isolation</h4>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { app: 'DDN RAG Demo v2', fe: '5174', be: '8000', color: '#807778' },
            { app: 'DDN Semantic Search', fe: '5175', be: '8001', color: '#807778' },
            { app: 'KV Cache Observatory ← YOU ARE HERE', fe: '5176', be: '8002', color: '#ED2738' },
          ].map(a => (
            <div key={a.app} className="p-3 rounded-lg" style={{ background: 'var(--surface-secondary)', border: `1px solid ${a.color}30` }}>
              <div className="font-semibold mb-1" style={{ color: a.color, fontSize: '11px' }}>{a.app}</div>
              <div style={{ color: 'var(--text-muted)' }}>FE: :{a.fe} · BE: :{a.be}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
