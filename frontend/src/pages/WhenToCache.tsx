import { useState } from 'react'
import {
  HelpCircle,
  Zap,
  ArrowRight,
  MessageSquare,
  BarChart3,
  Calculator,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Clock,
} from 'lucide-react'

interface Preset {
  id: string
  label: string
  icon: string
  color: string
  recomputeMs: number
  lookupMs: number
  transferMs: number
  hitRatePct: number
  badge: string
  desc: string
}

const PRESETS: Preset[] = [
  {
    id: 'user_reference',
    label: 'Hypothetical Workload (Baseline)',
    icon: '⚖️',
    color: '#1A81AF',
    recomputeMs: 800,
    lookupMs: 20,
    transferMs: 150,
    hitRatePct: 80,
    badge: 'Baseline Example',
    desc: 'The canonical reference model: 170ms hit latency yields 63.0% expected time saved.',
  },
  {
    id: 'ddn_infinia',
    label: 'DDN Infinia + RoCE (NVMe-oF)',
    icon: '⚡',
    color: '#00C280',
    recomputeMs: 950,
    lookupMs: 2,
    transferMs: 14,
    hitRatePct: 85,
    badge: 'DDN Production Hero',
    desc: 'Sub-millisecond lookup and GPU-Direct RDMA transfer drop hit time to 16ms, saving 83.6% latency.',
  },
  {
    id: 'cloud_s3',
    label: 'Standard Cloud S3 Bucket',
    icon: '☁️',
    color: '#6366F1',
    recomputeMs: 600,
    lookupMs: 35,
    transferMs: 380,
    hitRatePct: 75,
    badge: 'Object Store Bottleneck',
    desc: 'HTTP/TCP transfer latency (415ms hit) erodes benefits — yields only ~23% expected time saved.',
  },
  {
    id: 'legacy_nfs',
    label: 'Legacy NAS / NFS (Penalty Risk)',
    icon: '⚠️',
    color: '#ED2738',
    recomputeMs: 350,
    lookupMs: 25,
    transferMs: 480,
    hitRatePct: 50,
    badge: 'Negative Savings Penalty',
    desc: 'Slow storage transfer (505ms) is slower than GPU recompute (350ms), producing a latency penalty!',
  },
  {
    id: 'deep_rag',
    label: 'Deep RAG / 32k Agentic Context',
    icon: '📚',
    color: '#8B5CF6',
    recomputeMs: 2400,
    lookupMs: 3,
    transferMs: 32,
    hitRatePct: 90,
    badge: 'Heavy Context Win',
    desc: 'Massive prompt prefill times make cache retrieval dramatically faster (over 88% saved).',
  },
  {
    id: 'neocloud_ncp',
    label: 'Neocloud (NCP) Multi-Tenant Fleet',
    icon: '🏢',
    color: '#00C280',
    recomputeMs: 850,
    lookupMs: 2,
    transferMs: 18,
    hitRatePct: 92,
    badge: 'NCP Margin Expander',
    desc: 'High request density with shared prefixes yields 89.8% expected latency reduction.',
  },
]

interface WhenToCacheProps {
  onNavigate?: (tabId: string) => void
}

export default function WhenToCache({ onNavigate }: WhenToCacheProps) {
  // ── Core Sliders (Exact from user reference) ──
  const [recomputeMs, setRecomputeMs] = useState(800)
  const [lookupMs, setLookupMs] = useState(20)
  const [transferMs, setTransferMs] = useState(150)
  const [hitRatePct, setHitRatePct] = useState(80)
  const [activePreset, setActivePreset] = useState<string>('user_reference')

  // ── Mathematical Model ──
  const hitLatencyMs = lookupMs + transferMs
  const hitRate = hitRatePct / 100
  const expectedTimeMs = hitRate * hitLatencyMs + (1 - hitRate) * recomputeMs
  const timeSavedPct = recomputeMs > 0 ? ((recomputeMs - expectedTimeMs) / recomputeMs) * 100 : 0
  const timeSavedMs = recomputeMs - expectedTimeMs
  const isBeneficial = expectedTimeMs < recomputeMs
  const hitIsBeneficial = hitLatencyMs < recomputeMs

  const applyPreset = (p: Preset) => {
    setActivePreset(p.id)
    setRecomputeMs(p.recomputeMs)
    setLookupMs(p.lookupMs)
    setTransferMs(p.transferMs)
    setHitRatePct(p.hitRatePct)
  }

  const handleCustomChange = (setter: (v: number) => void, val: number) => {
    setActivePreset('custom')
    setter(val)
  }

  const resetToBaseline = () => {
    const p = PRESETS[0]
    applyPreset(p)
  }

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* ── Top GTC Announcement Ribbon ── */}
      <div
        className="rounded-xl px-4 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2 border"
        style={{
          background: 'rgba(0,194,128,0.06)',
          borderColor: 'rgba(0,194,128,0.25)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]" style={{ background: '#00C280', color: '#fff' }}>
            GTC Berlin 2026
          </span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Foundational Decision Framework: When does KV Cache win?
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-neutral-400">NVIDIA Hopper / Blackwell + DDN Infinia</span>
          <button
            onClick={resetToBaseline}
            className="flex items-center gap-1 hover:underline cursor-pointer"
            style={{ color: '#00C280' }}
          >
            <RotateCcw className="w-3 h-3" /> Reset to Baseline
          </button>
        </div>
      </div>

      {/* ── Section Title (Exact from Reference) ── */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full mb-1" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
          <HelpCircle className="w-3.5 h-3.5 text-[#ED2738]" />
          <span>Section 11 · Economic Feasibility Analysis</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          11. When is retrieving KV cache actually better than recomputing it?
        </h1>
        <p className="text-base md:text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
          This is the economic question that matters most.
        </p>
        <p className="text-xs md:text-sm text-neutral-500 max-w-3xl leading-relaxed">
          Modern GPUs (H100, H200, RTX 5090) prefill tokens at thousands of tokens per second. If storage or network retrieval is slow, fetching cached KV tensors can actually be <span className="text-red-500 font-semibold">slower</span> than letting the GPU compute from scratch. Use the interactive model below to discover your workload&apos;s inflection threshold.
        </p>
      </div>

      {/* ── Real-World Workload Presets ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Select a Workload Profile or Adjust Below
          </span>
          <span className="text-[11px] text-neutral-400">
            {activePreset === 'custom' ? 'Custom parameters active' : `${PRESETS.find(p => p.id === activePreset)?.badge}`}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRESETS.map(preset => {
            const isSelected = activePreset === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex flex-col justify-between"
                style={{
                  background: isSelected ? `${preset.color}14` : 'var(--surface-card)',
                  borderColor: isSelected ? preset.color : 'var(--border-subtle)',
                  boxShadow: isSelected ? `0 0 0 1px ${preset.color}` : 'none',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{preset.icon}</span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${preset.color}20`, color: preset.color }}
                    >
                      {preset.hitRatePct}% hit
                    </span>
                  </div>
                  <div className="text-xs font-bold leading-tight mb-1" style={{ color: isSelected ? preset.color : 'var(--text-primary)' }}>
                    {preset.label}
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400 mt-2 line-clamp-2 leading-snug">
                  {preset.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Interactive KV Reuse Example Card (Exact Layout from Image) ── */}
      <div
        className="rounded-2xl border p-6 md:p-8 space-y-6"
        style={{
          background: 'var(--surface-card)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Interactive KV reuse example
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Adjust the hypothetical workload assumptions to see when reuse becomes beneficial.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold font-mono"
              style={{
                background: isBeneficial ? 'rgba(0,194,128,0.1)' : 'rgba(237,39,56,0.1)',
                color: isBeneficial ? '#00C280' : '#ED2738',
                border: `1px solid ${isBeneficial ? 'rgba(0,194,128,0.3)' : 'rgba(237,39,56,0.3)'}`,
              }}
            >
              {isBeneficial ? '✓ Reuse Beneficial' : '⚠ Recompute Faster'}
            </span>
          </div>
        </div>

        {/* ── 4 Sliders (Exact from Image) ── */}
        <div className="space-y-5">
          {/* 1. GPU recompute time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                GPU recompute time
              </label>
              <div className="flex items-center gap-1 font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                <span>{recomputeMs}</span>
                <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
            </div>
            <input
              type="range"
              min={50}
              max={3000}
              step={10}
              value={recomputeMs}
              onChange={e => handleCustomChange(setRecomputeMs, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ED2738 ${((recomputeMs - 50) / (3000 - 50)) * 100}%, var(--surface-secondary) ${((recomputeMs - 50) / (3000 - 50)) * 100}%)`,
                accentColor: '#ED2738',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>50 ms (Short prompt)</span>
              <span>800 ms (Medium)</span>
              <span>3,000 ms (Heavy RAG / 32k)</span>
            </div>
          </div>

          {/* 2. Storage lookup time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Storage lookup time
              </label>
              <div className="flex items-center gap-1 font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                <span>{lookupMs}</span>
                <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={lookupMs}
              onChange={e => handleCustomChange(setLookupMs, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1A81AF ${((lookupMs - 1) / (100 - 1)) * 100}%, var(--surface-secondary) ${((lookupMs - 1) / (100 - 1)) * 100}%)`,
                accentColor: '#1A81AF',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>1 ms (DDN Infinia NVMe Metadata)</span>
              <span>20 ms (Typical)</span>
              <span>100 ms (High contention Cloud)</span>
            </div>
          </div>

          {/* 3. KV transfer and restore time */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                KV transfer and restore time
              </label>
              <div className="flex items-center gap-1 font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                <span>{transferMs}</span>
                <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={800}
              step={2}
              value={transferMs}
              onChange={e => handleCustomChange(setTransferMs, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1A81AF ${((transferMs - 2) / (800 - 2)) * 100}%, var(--surface-secondary) ${((transferMs - 2) / (800 - 2)) * 100}%)`,
                accentColor: '#1A81AF',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>8 ms (DDN GPU-Direct RoCE)</span>
              <span>150 ms (Reference standard)</span>
              <span>800 ms (Slow TCP / Cloud WAN)</span>
            </div>
          </div>

          {/* 4. Cache hit rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Cache hit rate
              </label>
              <div className="flex items-center gap-1 font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                <span>{hitRatePct}%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={hitRatePct}
              onChange={e => handleCustomChange(setHitRatePct, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00C280 ${hitRatePct}%, var(--surface-secondary) ${hitRatePct}%)`,
                accentColor: '#00C280',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>0% (Cold / Zero sharing)</span>
              <span>50% (Mixed chat)</span>
              <span>100% (Static prefix / System prompt)</span>
            </div>
          </div>
        </div>

        {/* ── KPI Outputs (Exact from Reference) ── */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Expected time */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Expected time</div>
              <div className="font-mono text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {expectedTimeMs.toFixed(0)} ms
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Hit ({hitLatencyMs}ms) vs Miss ({recomputeMs}ms)
              </div>
            </div>

            {/* Expected time saved */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Expected time saved</div>
              <div
                className="font-mono text-2xl md:text-3xl font-bold"
                style={{ color: isBeneficial ? '#00C280' : '#ED2738' }}
              >
                {timeSavedPct >= 0 ? `${timeSavedPct.toFixed(1)}%` : `${timeSavedPct.toFixed(1)}%`}
              </div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: isBeneficial ? '#00C280' : '#ED2738' }}>
                {isBeneficial ? `-${timeSavedMs.toFixed(0)} ms reduction` : `+${Math.abs(timeSavedMs).toFixed(0)} ms penalty`}
              </div>
            </div>

            {/* Cache Hit Latency */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Hit Retrieval Latency</div>
              <div className="font-mono text-2xl md:text-3xl font-bold" style={{ color: '#1A81AF' }}>
                {hitLatencyMs} ms
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Lookup {lookupMs}ms + Transfer {transferMs}ms
              </div>
            </div>

            {/* GPU Cycles Freed */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">GPU Compute Avoided</div>
              <div className="font-mono text-2xl md:text-3xl font-bold" style={{ color: '#76B900' }}>
                {hitRatePct}%
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Prefill skipped on cache hit
              </div>
            </div>
          </div>
        </div>

        {/* ── Dynamic Result Message (Exact phrasing from Reference image + adaptive) ── */}
        <div
          className="rounded-xl p-4 text-xs md:text-sm leading-relaxed border"
          style={{
            background: isBeneficial ? 'rgba(0,194,128,0.06)' : 'rgba(237,39,56,0.06)',
            borderColor: isBeneficial ? 'rgba(0,194,128,0.25)' : 'rgba(237,39,56,0.25)',
            color: 'var(--text-secondary)',
          }}
        >
          {isBeneficial ? (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#00C280' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>
                  A successful cache hit is faster than recomputation under these assumptions.
                </strong>{' '}
                The expected result is a latency reduction of{' '}
                <strong style={{ color: '#00C280' }}>{timeSavedPct.toFixed(1)}%</strong> ({recomputeMs} ms → {expectedTimeMs.toFixed(0)} ms average response). On pure hits, requests return in just{' '}
                <strong>{hitLatencyMs} ms</strong> — bypassing {(recomputeMs - hitLatencyMs).toFixed(0)} ms of heavy GPU prefill work.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ED2738' }} />
              <div>
                <strong style={{ color: '#ED2738' }}>
                  Recomputation is faster than retrieval under these assumptions.
                </strong>{' '}
                The expected result is a latency penalty of{' '}
                <strong>{Math.abs(timeSavedPct).toFixed(1)}%</strong>. Because retrieval latency ({hitLatencyMs} ms) exceeds GPU recompute time ({recomputeMs} ms), storing KV cache on this infrastructure is counter-productive.
                <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  💡 This demonstrates why high-speed storage fabric (such as DDN Infinia over RoCE/RDMA with &lt;15ms transfer) is an absolute prerequisite for KV caching.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Visual Comparison Bar: Recompute vs Hit vs Expected ── */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Latency Comparison Breakdown
          </div>
          <div className="space-y-2 text-xs">
            {/* 1. Baseline Recompute */}
            <div className="flex items-center gap-3">
              <span className="w-32 truncate text-neutral-400 font-mono text-[11px]">Full Recompute:</span>
              <div className="flex-1 h-5 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--surface-secondary)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono text-white font-bold"
                  style={{ width: '100%', background: '#ED2738' }}
                >
                  {recomputeMs} ms (Baseline GPU Prefill)
                </div>
              </div>
            </div>

            {/* 2. Cache Hit Latency */}
            <div className="flex items-center gap-3">
              <span className="w-32 truncate text-neutral-400 font-mono text-[11px]">Cache Hit Retrieval:</span>
              <div className="flex-1 h-5 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--surface-secondary)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono font-bold"
                  style={{
                    width: `${Math.min((hitLatencyMs / recomputeMs) * 100, 100)}%`,
                    background: hitIsBeneficial ? '#00C280' : '#FF7600',
                    color: '#fff',
                  }}
                >
                  {hitLatencyMs} ms ({hitIsBeneficial ? `${Math.round((1 - hitLatencyMs / recomputeMs) * 100)}% faster` : 'slower'})
                </div>
              </div>
            </div>

            {/* 3. Expected Time (Blended) */}
            <div className="flex items-center gap-3">
              <span className="w-32 truncate text-neutral-400 font-mono text-[11px]">Expected Average:</span>
              <div className="flex-1 h-5 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--surface-secondary)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono font-bold"
                  style={{
                    width: `${Math.min((expectedTimeMs / recomputeMs) * 100, 100)}%`,
                    background: isBeneficial ? 'linear-gradient(90deg, #1A81AF, #00C280)' : '#ED2738',
                    color: '#fff',
                  }}
                >
                  {expectedTimeMs.toFixed(0)} ms ({timeSavedPct >= 0 ? `${timeSavedPct.toFixed(1)}% saved` : 'penalty'})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footnote (Exact from Reference Image) ── */}
        <div className="text-[11px] text-neutral-400 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
          Simplified sequential latency model. Misses are assumed to fall back to recomputation without extra lookup penalty. Real systems may overlap transfers with compute and incur additional scheduling, lookup, and restoration costs.
        </div>
      </div>

      {/* ── The Architectural Physics: Why DDN Infinia Wins ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            The Physics of KV Cache: Why Traditional Storage Fails
          </h3>
          <p className="text-xs text-neutral-500">
            Why high-speed fabric is the make-or-break variable for enterprise KV reuse:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 space-y-2 border" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 font-bold text-xs" style={{ color: '#ED2738' }}>
              <Layers className="w-4 h-4" />
              <span>1. The Transfer Bottleneck</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              A 32k context KV tensor can exceed 500 MB. Over standard S3/NFS (TCP, 10GbE), pulling that tensor takes <strong className="text-red-500">250–600 ms</strong>. That latency wipes out GPU prefill time, making caching useless.
            </p>
          </div>

          <div className="card p-4 space-y-2 border" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 font-bold text-xs" style={{ color: '#00C280' }}>
              <Zap className="w-4 h-4" />
              <span>2. DDN Infinia RDMA Acceleration</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              DDN Infinia utilizes <strong className="text-emerald-500">GPU-Direct RDMA over 200/400Gbps RoCE</strong>. Transfer times plummet to <strong className="text-emerald-500">8–18 ms</strong>, guaranteeing cache retrieval wins even on shorter prompts.
            </p>
          </div>

          <div className="card p-4 space-y-2 border" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 font-bold text-xs" style={{ color: '#1A81AF' }}>
              <Clock className="w-4 h-4" />
              <span>3. GPU Concurrency Multiplication</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Every millisecond of prefill bypassed directly frees GPU HBM memory and compute tensor cores. A single DGX server can serve <strong className="text-blue-500">3–5× more concurrent users</strong> without buying extra nodes.
            </p>
          </div>
        </div>
      </div>

      {/* ── Guided Next Steps: Live Demo Launchpad ── */}
      <div
        className="rounded-2xl p-6 border space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(26,129,175,0.06), rgba(0,194,128,0.06))',
          borderColor: 'rgba(26,129,175,0.2)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#1A81AF] mb-1">
              Now See It Live In Production
            </div>
            <h3 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Explore the Live DDN Infinia Modules
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Move beyond hypothetical models. Watch real vLLM/Ollama inference and Infinia storage interaction:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Module 1: Chat Observatory */}
          <button
            onClick={() => onNavigate?.('observatory')}
            className="card p-4 text-left transition-all hover:scale-105 active:scale-95 cursor-pointer border group space-y-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(237,39,56,0.1)', color: '#ED2738' }}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Live Chat Observatory
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Side-by-side live bot comparison. See 3.2ms TTFT vs 45ms full recompute in real time.
              </p>
            </div>
          </button>

          {/* Module 2: Prefix Multiplier */}
          <button
            onClick={() => onNavigate?.('prefix')}
            className="card p-4 text-left transition-all hover:scale-105 active:scale-95 cursor-pointer border group space-y-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(0,194,128,0.1)', color: '#00C280' }}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Prefix Multiplier
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Multi-tenant concurrency simulation. Scale from 1 to 64 streams on shared system prefixes.
              </p>
            </div>
          </button>

          {/* Module 3: Enterprise ROI Calculator */}
          <button
            onClick={() => onNavigate?.('roi')}
            className="card p-4 text-left transition-all hover:scale-105 active:scale-95 cursor-pointer border group space-y-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(26,129,175,0.1)', color: '#1A81AF' }}>
                <Calculator className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Enterprise ROI Calculator
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Translate these millisecond savings into $100k+ annual CapEx avoidance and power savings.
              </p>
            </div>
          </button>

          {/* Module 4: AIperf Benchmark */}
          <button
            onClick={() => onNavigate?.('aiperf')}
            className="card p-4 text-left transition-all hover:scale-105 active:scale-95 cursor-pointer border group space-y-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(118,185,0,0.1)', color: '#76B900' }}>
                <Activity className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                AIperf Benchmark & Proof
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Automated synthetic benchmarks and raw Infinia S3 object inspector proof.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
