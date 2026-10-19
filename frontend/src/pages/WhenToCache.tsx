import { useState } from 'react'
import {
  HelpCircle,
  ArrowRight,
  MessageSquare,
  BarChart3,
  Calculator,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

interface WhenToCacheProps {
  onNavigate?: (tabId: string) => void
}

// ── Baseline Workload Constants ──
const BASELINE = {
  recomputeMs: 800,
  lookupMs: 20,
  transferMs: 150,
  hitRatePct: 80,
}

export default function WhenToCache({ onNavigate }: WhenToCacheProps) {
  // ── Core Sliders (Exact from user reference) ──
  const [recomputeMs, setRecomputeMs] = useState(BASELINE.recomputeMs)
  const [lookupMs, setLookupMs] = useState(BASELINE.lookupMs)
  const [transferMs, setTransferMs] = useState(BASELINE.transferMs)
  const [hitRatePct, setHitRatePct] = useState(BASELINE.hitRatePct)

  // ── Mathematical Model ──
  const hitLatencyMs = lookupMs + transferMs
  const hitRate = hitRatePct / 100
  const expectedTimeMs = hitRate * hitLatencyMs + (1 - hitRate) * recomputeMs
  const timeSavedPct = recomputeMs > 0 ? ((recomputeMs - expectedTimeMs) / recomputeMs) * 100 : 0
  const timeSavedMs = recomputeMs - expectedTimeMs
  const isBeneficial = expectedTimeMs < recomputeMs
  const hitIsBeneficial = hitLatencyMs < recomputeMs

  const resetToBaseline = () => {
    setRecomputeMs(BASELINE.recomputeMs)
    setLookupMs(BASELINE.lookupMs)
    setTransferMs(BASELINE.transferMs)
    setHitRatePct(BASELINE.hitRatePct)
  }

  const isAtBaseline =
    recomputeMs === BASELINE.recomputeMs &&
    lookupMs === BASELINE.lookupMs &&
    transferMs === BASELINE.transferMs &&
    hitRatePct === BASELINE.hitRatePct

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
          {!isAtBaseline && (
            <button
              onClick={resetToBaseline}
              className="flex items-center gap-1 hover:underline cursor-pointer font-medium"
              style={{ color: '#00C280' }}
            >
              <RotateCcw className="w-3 h-3" /> Reset to Baseline
            </button>
          )}
        </div>
      </div>

      {/* ── Section Title ── */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-1" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
          <HelpCircle className="w-3.5 h-3.5 text-[#ED2738]" />
          <span>Economic Feasibility Analysis</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          When is retrieving KV cache actually better than recomputing it?
        </h1>
        <p className="text-base md:text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
          This is the economic question that matters most.
        </p>
        <p className="text-xs md:text-sm text-neutral-500 max-w-3xl leading-relaxed">
          Modern GPUs (H100, H200, RTX 5090) prefill tokens at thousands of tokens per second. If storage or network retrieval is slow, fetching cached KV tensors can be slower than letting the GPU compute from scratch. Use the interactive model below to evaluate workload assumptions and discover the threshold where caching outperforms recomputation.
        </p>
      </div>

      {/* ── Main Interactive KV Reuse Example Card (Exact Layout from Reference Image) ── */}
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
              className="px-2.5 py-1 rounded-full text-xs font-semibold font-mono flex items-center gap-1"
              style={{
                background: isBeneficial ? 'rgba(0,194,128,0.1)' : 'rgba(237,39,56,0.1)',
                color: isBeneficial ? '#00C280' : '#ED2738',
                border: `1px solid ${isBeneficial ? 'rgba(0,194,128,0.3)' : 'rgba(237,39,56,0.3)'}`,
              }}
            >
              {isBeneficial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isBeneficial ? 'Reuse Beneficial' : 'Recompute Faster'}
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
              onChange={e => setRecomputeMs(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ED2738 ${((recomputeMs - 50) / (3000 - 50)) * 100}%, var(--surface-secondary) ${((recomputeMs - 50) / (3000 - 50)) * 100}%)`,
                accentColor: '#ED2738',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>50 ms (Short prompt)</span>
              <span>800 ms (Baseline)</span>
              <span>3,000 ms (Heavy context)</span>
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
              onChange={e => setLookupMs(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1A81AF ${((lookupMs - 1) / (100 - 1)) * 100}%, var(--surface-secondary) ${((lookupMs - 1) / (100 - 1)) * 100}%)`,
                accentColor: '#1A81AF',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>1 ms (Fast NVMe index)</span>
              <span>20 ms (Baseline)</span>
              <span>100 ms (High latency storage)</span>
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
              onChange={e => setTransferMs(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1A81AF ${((transferMs - 2) / (800 - 2)) * 100}%, var(--surface-secondary) ${((transferMs - 2) / (800 - 2)) * 100}%)`,
                accentColor: '#1A81AF',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>8 ms (RoCE / GPU-Direct)</span>
              <span>150 ms (Baseline)</span>
              <span>800 ms (Slow TCP fabric)</span>
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
              onChange={e => setHitRatePct(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00C280 ${hitRatePct}%, var(--surface-secondary) ${hitRatePct}%)`,
                accentColor: '#00C280',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>0% (Cold / No sharing)</span>
              <span>80% (Baseline)</span>
              <span>100% (Full reuse)</span>
            </div>
          </div>
        </div>

        {/* ── KPI Outputs (Exact from Reference Image) ── */}
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
                <strong style={{ color: '#00C280' }}>{timeSavedPct.toFixed(1)}%</strong> ({recomputeMs} ms to {expectedTimeMs.toFixed(0)} ms average response). On pure hits, requests return in{' '}
                <strong>{hitLatencyMs} ms</strong>, bypassing {(recomputeMs - hitLatencyMs).toFixed(0)} ms of heavy GPU prefill work.
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
                <strong>{Math.abs(timeSavedPct).toFixed(1)}%</strong>. Because retrieval latency ({hitLatencyMs} ms) exceeds GPU recompute time ({recomputeMs} ms), storing KV cache on this infrastructure is counter-productive without lower latency storage fabric.
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
              Live Production Showcase
            </div>
            <h3 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Explore the Live DDN Infinia Modules
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Watch real vLLM inference and DDN Infinia persistent memory interaction in real time:
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
