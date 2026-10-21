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
  Zap,
  HardDrive,
} from 'lucide-react'

interface WhenToCacheProps {
  onNavigate?: (tabId: string) => void
}

// ── Baseline & Preset Constants ──
const BASELINE = {
  recomputeMs: 800,
  lookupMs: 20,
  transferMs: 150,
  hitRatePct: 80,
}

const PRESETS = {
  baseline: {
    label: 'Standard Baseline',
    recomputeMs: 800,
    lookupMs: 20,
    transferMs: 150,
    hitRatePct: 80,
  },
  infinia: {
    label: 'DDN Infinia + RoCE',
    recomputeMs: 800,
    lookupMs: 2,
    transferMs: 14,
    hitRatePct: 85,
  },
  bottleneck: {
    label: 'Storage Bottleneck (No Gain)',
    recomputeMs: 500,
    lookupMs: 150,
    transferMs: 650,
    hitRatePct: 80,
  },
}

export default function WhenToCache({ onNavigate }: WhenToCacheProps) {
  // ── Core Sliders & Inputs (Unsealed ranges up to 5,000 ms) ──
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
  const latencyPenaltyMs = hitLatencyMs - recomputeMs

  // Scale bars relative to maximum observed latency
  const maxScaleMs = Math.max(recomputeMs, hitLatencyMs, expectedTimeMs, 100)

  const applyPreset = (preset: typeof BASELINE) => {
    setRecomputeMs(preset.recomputeMs)
    setLookupMs(preset.lookupMs)
    setTransferMs(preset.transferMs)
    setHitRatePct(preset.hitRatePct)
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
              onClick={() => applyPreset(BASELINE)}
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
          Modern GPUs (H100, H200, RTX 5090) prefill tokens at thousands of tokens per second. If G4 Shared Storage lookup and network transfer are slow, retrieving cached KV tensors can take longer than recomputing them directly on GPU Tensor Cores. Use this unsealed interactive model to test realistic, high-latency, or optimized scenarios.
        </p>
      </div>

      {/* ── Main Interactive KV Reuse Example Card ── */}
      <div
        className="rounded-2xl border p-6 md:p-8 space-y-6"
        style={{
          background: 'var(--surface-card)',
          borderColor: isBeneficial ? 'var(--border-default)' : 'rgba(237,39,56,0.4)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Card Header & Status Badges */}
        <div className="flex items-start justify-between flex-wrap gap-4 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Interactive KV Reuse Feasibility Model
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Compare GPU prefill time against NVIDIA G4 Shared Storage lookup and fabric transfer latency.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Scenario Buttons */}
            <button
              onClick={() => applyPreset(PRESETS.baseline)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
              style={{
                background: isAtBaseline ? 'rgba(26,129,175,0.15)' : 'var(--surface-secondary)',
                borderColor: isAtBaseline ? '#1A81AF' : 'var(--border-subtle)',
                color: isAtBaseline ? '#1A81AF' : 'var(--text-secondary)',
              }}
            >
              Baseline (63% Gain)
            </button>
            <button
              onClick={() => applyPreset(PRESETS.infinia)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1"
              style={{
                background:
                  recomputeMs === PRESETS.infinia.recomputeMs &&
                  lookupMs === PRESETS.infinia.lookupMs &&
                  transferMs === PRESETS.infinia.transferMs
                    ? 'rgba(0,194,128,0.15)'
                    : 'var(--surface-secondary)',
                borderColor:
                  recomputeMs === PRESETS.infinia.recomputeMs &&
                  lookupMs === PRESETS.infinia.lookupMs &&
                  transferMs === PRESETS.infinia.transferMs
                    ? '#00C280'
                    : 'var(--border-subtle)',
                color: '#00C280',
              }}
            >
              <Zap className="w-3 h-3" /> DDN Infinia (98% Gain)
            </button>
            <button
              onClick={() => applyPreset(PRESETS.bottleneck)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1"
              style={{
                background:
                  recomputeMs === PRESETS.bottleneck.recomputeMs &&
                  lookupMs === PRESETS.bottleneck.lookupMs &&
                  transferMs === PRESETS.bottleneck.transferMs
                    ? 'rgba(237,39,56,0.15)'
                    : 'var(--surface-secondary)',
                borderColor:
                  recomputeMs === PRESETS.bottleneck.recomputeMs &&
                  lookupMs === PRESETS.bottleneck.lookupMs &&
                  transferMs === PRESETS.bottleneck.transferMs
                    ? '#ED2738'
                    : 'var(--border-subtle)',
                color: '#ED2738',
              }}
            >
              <AlertTriangle className="w-3 h-3" /> Storage Bottleneck (No Gain)
            </button>

            {/* Verdict Badge */}
            <span
              className="px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5"
              style={{
                background: isBeneficial ? 'rgba(0,194,128,0.12)' : 'rgba(237,39,56,0.15)',
                color: isBeneficial ? '#00C280' : '#ED2738',
                border: `1px solid ${isBeneficial ? 'rgba(0,194,128,0.4)' : 'rgba(237,39,56,0.5)'}`,
              }}
            >
              {isBeneficial ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {isBeneficial ? 'KV Cache Effective' : 'NO GAIN WITH KV CACHE'}
            </span>
          </div>
        </div>

        {/* ── 4 Unsealed Sliders with Direct Numeric Inputs ── */}
        <div className="space-y-6">
          {/* 1. GPU recompute time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  GPU recompute time
                </label>
                <div className="text-[11px] text-neutral-400">
                  Time for GPU Tensor Cores to compute KV tensors from scratch (prefill)
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={10000}
                  step={10}
                  value={recomputeMs}
                  onChange={e => setRecomputeMs(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-2 py-1 text-right font-mono font-bold text-sm rounded-lg border focus:outline-none"
                  style={{
                    background: 'var(--surface-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
            </div>
            <input
              type="range"
              min={50}
              max={5000}
              step={10}
              value={Math.min(recomputeMs, 5000)}
              onChange={e => setRecomputeMs(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ED2738 ${((Math.min(recomputeMs, 5000) - 50) / (5000 - 50)) * 100}%, var(--surface-secondary) ${((Math.min(recomputeMs, 5000) - 50) / (5000 - 50)) * 100}%)`,
                accentColor: '#ED2738',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>50 ms (Short prompt)</span>
              <span>800 ms (Baseline prefill)</span>
              <span>5,000 ms (Deep 32k+ Agent context)</span>
            </div>
          </div>

          {/* 2. NVIDIA G4 Shared Storage lookup time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    G4 Shared Storage lookup time
                  </label>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                    style={{ background: 'rgba(26,129,175,0.15)', color: '#1A81AF' }}
                  >
                    NVIDIA G4 Hierarchy
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Metadata query & index search across cluster shared storage (DDN Infinia, S3, NFS)
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  step={1}
                  value={lookupMs}
                  onChange={e => setLookupMs(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-2 py-1 text-right font-mono font-bold text-sm rounded-lg border focus:outline-none"
                  style={{
                    background: 'var(--surface-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={3000}
              step={1}
              value={Math.min(lookupMs, 3000)}
              onChange={e => setLookupMs(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1A81AF ${((Math.min(lookupMs, 3000) - 1) / (3000 - 1)) * 100}%, var(--surface-secondary) ${((Math.min(lookupMs, 3000) - 1) / (3000 - 1)) * 100}%)`,
                accentColor: '#1A81AF',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>1 ms (DDN Infinia NVMe-oF)</span>
              <span>20 ms (Baseline lookup)</span>
              <span>3,000 ms (High-latency object store)</span>
            </div>
          </div>

          {/* 3. KV transfer and restore time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  KV transfer and restore time
                </label>
                <div className="text-[11px] text-neutral-400">
                  Network fabric transit from G4 Shared Storage into GPU HBM and tensor deserialization
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={2}
                  value={transferMs}
                  onChange={e => setTransferMs(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-2 py-1 text-right font-mono font-bold text-sm rounded-lg border focus:outline-none"
                  style={{
                    background: 'var(--surface-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-xs font-normal text-neutral-400">ms</span>
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={5000}
              step={2}
              value={Math.min(transferMs, 5000)}
              onChange={e => setTransferMs(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1A81AF ${((Math.min(transferMs, 5000) - 2) / (5000 - 2)) * 100}%, var(--surface-secondary) ${((Math.min(transferMs, 5000) - 2) / (5000 - 2)) * 100}%)`,
                accentColor: '#1A81AF',
              }}
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>8 ms (DDN GPU-Direct RoCE)</span>
              <span>150 ms (Baseline network)</span>
              <span>5,000 ms (Slow TCP fabric / WAN)</span>
            </div>
          </div>

          {/* 4. Cache hit rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Cache hit rate
                </label>
                <div className="text-[11px] text-neutral-400">
                  Percentage of requests matching previously stored prompt prefixes or documents
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={hitRatePct}
                  onChange={e => setHitRatePct(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-20 px-2 py-1 text-right font-mono font-bold text-sm rounded-lg border focus:outline-none"
                  style={{
                    background: 'var(--surface-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-xs font-normal text-neutral-400">%</span>
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
              <span>0% (Cold / Zero sharing)</span>
              <span>80% (Baseline)</span>
              <span>100% (Full reuse / Static system prompt)</span>
            </div>
          </div>
        </div>

        {/* ── KPI Outputs ── */}
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

            {/* Expected time saved / Penalty */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">
                {isBeneficial ? 'Expected time saved' : 'Latency impact'}
              </div>
              <div
                className="font-mono text-2xl md:text-3xl font-bold"
                style={{ color: isBeneficial ? '#00C280' : '#ED2738' }}
              >
                {isBeneficial ? `${timeSavedPct.toFixed(1)}%` : `NO GAIN (${timeSavedPct.toFixed(1)}%)`}
              </div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: isBeneficial ? '#00C280' : '#ED2738' }}>
                {isBeneficial
                  ? `-${timeSavedMs.toFixed(0)} ms reduction per query`
                  : `+${Math.abs(timeSavedMs).toFixed(0)} ms penalty per query`}
              </div>
            </div>

            {/* Cache Hit Latency */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Hit Retrieval Latency</div>
              <div
                className="font-mono text-2xl md:text-3xl font-bold"
                style={{ color: hitIsBeneficial ? '#1A81AF' : '#ED2738' }}
              >
                {hitLatencyMs} ms
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: hitIsBeneficial ? 'var(--text-secondary)' : '#ED2738' }}
              >
                {hitIsBeneficial
                  ? `G4 (${lookupMs}ms) + Transfer (${transferMs}ms)`
                  : `SLOWER than GPU (${hitLatencyMs}ms > ${recomputeMs}ms)`}
              </div>
            </div>

            {/* GPU Cycles Freed */}
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">GPU Compute Avoided</div>
              <div
                className="font-mono text-2xl md:text-3xl font-bold"
                style={{ color: hitIsBeneficial ? '#76B900' : '#ED2738' }}
              >
                {hitRatePct}%
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {hitIsBeneficial ? 'Prefill skipped on cache hit' : 'Skipped, but storage delay cancels gain'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Dynamic Result & Architectural Verdict (Explicit NO GAIN callout) ── */}
        {isBeneficial ? (
          <div
            className="rounded-xl p-4 md:p-5 border space-y-2"
            style={{
              background: 'rgba(0, 194, 128, 0.08)',
              borderColor: 'rgba(0, 194, 128, 0.35)',
            }}
          >
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm md:text-base">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>KV CACHE IS EFFECTIVE ({timeSavedPct.toFixed(1)}% LATENCY REDUCTION)</span>
            </div>
            <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
              G4 Shared Storage Lookup (<strong>{lookupMs} ms</strong>) + KV Transfer (<strong>{transferMs} ms</strong>) ={' '}
              <strong className="text-emerald-400 font-mono text-sm">{hitLatencyMs} ms</strong> retrieval latency.
              Cache hits return <strong>{(recomputeMs - hitLatencyMs).toFixed(0)} ms faster</strong> than GPU recomputing from scratch (<strong>{recomputeMs} ms</strong>).
            </p>
            <div className="text-xs text-neutral-400 leading-relaxed pt-2 border-t border-emerald-500/20">
              With an assumed {hitRatePct}% hit rate, blended query response drops from <strong>{recomputeMs} ms</strong> to{' '}
              <strong>{expectedTimeMs.toFixed(0)} ms</strong> (saving <strong className="text-emerald-400">{timeSavedPct.toFixed(1)}%</strong> overall latency). GPU prefill compute is bypassed on cache hits, directly freeing HBM and Tensor Cores for greater multi-tenant concurrency.
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-4 md:p-5 border space-y-2.5"
            style={{
              background: 'rgba(237, 39, 56, 0.09)',
              borderColor: 'rgba(237, 39, 56, 0.45)',
            }}
          >
            <div className="flex items-center gap-2 text-red-500 font-extrabold text-sm md:text-base">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>NO GAIN WITH KV CACHE — RECOMPUTATION IS FASTER</span>
            </div>
            <p className="text-xs md:text-sm text-neutral-200 leading-relaxed">
              G4 Shared Storage Lookup (<strong>{lookupMs} ms</strong>) + KV Transfer (<strong>{transferMs} ms</strong>) ={' '}
              <strong className="text-red-400 font-mono text-base">{hitLatencyMs} ms</strong> retrieval latency.
              This takes <strong className="text-red-400">+{latencyPenaltyMs > 0 ? latencyPenaltyMs : 0} ms longer</strong> than letting GPU Tensor Cores recompute tokens directly (<strong>{recomputeMs} ms</strong>).
            </p>
            <div className="text-xs text-neutral-300 leading-relaxed pt-2 border-t border-red-500/25">
              <strong>Why there is NO GAIN:</strong> When storage retrieval ({hitLatencyMs} ms) is slower than GPU compute ({recomputeMs} ms), fetching cached KV tensors from storage causes a net latency penalty of{' '}
              <strong className="text-red-400">+{Math.abs(timeSavedPct).toFixed(1)}% (+{Math.abs(timeSavedMs).toFixed(0)} ms)</strong>.
              In this scenario, KV caching is counter-productive. To unlock KV cache benefits, storage and fabric latency must be reduced below GPU recompute time using high-speed fabric (such as DDN Infinia GPU-Direct RDMA / RoCE with sub-15ms transfer).
            </div>
          </div>
        )}

        {/* ── Visual Latency Waterfall Breakdown (Dynamically Scaled) ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Latency Comparison Breakdown
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              Normalized against peak latency ({maxScaleMs.toFixed(0)} ms)
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* 1. Baseline Recompute */}
            <div className="flex items-center gap-3">
              <span className="w-36 truncate text-neutral-400 font-mono text-[11px]">Full Recompute:</span>
              <div className="flex-1 h-6 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--surface-secondary)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono text-white font-bold"
                  style={{
                    width: `${Math.min((recomputeMs / maxScaleMs) * 100, 100)}%`,
                    background: '#ED2738',
                  }}
                >
                  {recomputeMs} ms (GPU Prefill Baseline)
                </div>
              </div>
            </div>

            {/* 2. Cache Hit Retrieval */}
            <div className="flex items-center gap-3">
              <span className="w-36 truncate text-neutral-400 font-mono text-[11px]">Cache Hit Retrieval:</span>
              <div className="flex-1 h-6 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--surface-secondary)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono font-bold"
                  style={{
                    width: `${Math.min((hitLatencyMs / maxScaleMs) * 100, 100)}%`,
                    background: hitIsBeneficial ? '#00C280' : '#ED2738',
                    color: '#fff',
                  }}
                >
                  {hitLatencyMs} ms ({hitIsBeneficial ? `${Math.round((1 - hitLatencyMs / recomputeMs) * 100)}% faster than GPU` : `NO GAIN · ${latencyPenaltyMs} ms SLOWER than GPU`})
                </div>
              </div>
            </div>

            {/* 3. Expected Time (Blended) */}
            <div className="flex items-center gap-3">
              <span className="w-36 truncate text-neutral-400 font-mono text-[11px]">Expected Average:</span>
              <div className="flex-1 h-6 rounded-lg overflow-hidden relative flex items-center" style={{ background: 'var(--surface-secondary)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-mono font-bold"
                  style={{
                    width: `${Math.min((expectedTimeMs / maxScaleMs) * 100, 100)}%`,
                    background: isBeneficial ? 'linear-gradient(90deg, #1A81AF, #00C280)' : '#ED2738',
                    color: '#fff',
                  }}
                >
                  {expectedTimeMs.toFixed(0)} ms ({timeSavedPct >= 0 ? `${timeSavedPct.toFixed(1)}% saved` : `NO GAIN · ${Math.abs(timeSavedPct).toFixed(1)}% penalty`})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── NVIDIA G4 Architecture Footnote ── */}
        <div className="text-[11px] text-neutral-400 border-t pt-3 space-y-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="font-semibold text-neutral-300">
            NVIDIA Inference Memory Hierarchy & Mathematical Rule:
          </div>
          <div>
            In NVIDIA LLM inference architectures, memory is organized into distinct tiers: <span className="font-mono text-neutral-300">G1</span> = GPU HBM, <span className="font-mono text-neutral-300">G2</span> = Host CPU DRAM, <span className="font-mono text-neutral-300">G3</span> = Local NVMe Flash, and <span className="font-mono text-neutral-300">G4</span> = Enterprise Shared / Networked Storage.
          </div>
          <div>
            <strong>The Fundamental Rule:</strong> Whenever <span className="font-mono text-neutral-300">T_lookup(G4) + T_transfer &ge; T_recompute(GPU)</span>, caching produces <strong>NO GAIN</strong>. High-performance storage fabric like DDN Infinia over RoCE/RDMA reduces G4 retrieval latency to &lt;16 ms, ensuring KV cache consistently wins.
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
