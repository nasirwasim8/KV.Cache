import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Sliders, Gauge, Flame, ShieldAlert, CheckCircle2,
  RefreshCw, AlertTriangle, Layers, Activity, TrendingUp, Info,
  Cpu, Zap, Server
} from 'lucide-react'

export default function HighChurnEvictionSimulator() {
  const [reqRate, setReqRate] = useState<number>(15000)

  // Presets
  const setPreset = (rate: number) => {
    setReqRate(rate)
  }

  // Calculated reactive metrics
  const metrics = useMemo(() => {
    const ratio = Math.max(0, Math.min(1, (reqRate - 1000) / 49000))

    // Eviction operations per second (KV cache blocks expiring)
    const evictionsPerSec = Math.round(reqRate * (0.15 + ratio * 0.70))

    // POSIX / Element Store metrics (WEKA / VAST)
    const posixLocks = Math.round(24 + Math.pow(ratio, 2.2) * 28500)
    const posixP99 = Number((12.5 + Math.pow(ratio, 2.4) * 1950).toFixed(1))
    const posixCpu = Math.min(94, Math.round(5 + ratio * 86))

    // Infinia metrics
    const infiniaLocks = 0
    const infiniaP99 = Number((0.82 + ratio * 0.24).toFixed(2))
    const infiniaCpu = '< 1%'

    let posixStatus: { label: string; color: string; badge: string; bg: string }
    if (ratio < 0.22) {
      posixStatus = {
        label: 'Low Journal Pressure',
        color: '#00C280',
        badge: 'Normal Inode Operations',
        bg: 'rgba(0,194,128,0.1)',
      }
    } else if (ratio < 0.60) {
      posixStatus = {
        label: 'MDS Inode Lock Contention',
        color: '#F59E0B',
        badge: '⚠️ Moderate P99 Jitter',
        bg: 'rgba(245,158,11,0.1)',
      }
    } else {
      posixStatus = {
        label: 'Catastrophic GC Storm & Lockout',
        color: '#ED2738',
        badge: '🚨 Severe Tail Latency Spike',
        bg: 'rgba(237,39,56,0.12)',
      }
    }

    return {
      ratio,
      evictionsPerSec,
      posix: {
        locks: posixLocks,
        p99: posixP99,
        cpu: posixCpu,
        status: posixStatus,
      },
      infinia: {
        locks: infiniaLocks,
        p99: infiniaP99,
        cpu: infiniaCpu,
        status: {
          label: 'Deterministic Line-Rate Invalidation',
          color: '#00C280',
          badge: 'Sub-ms Flat',
          bg: 'rgba(0,194,128,0.1)',
        },
      },
    }
  }, [reqRate])

  return (
    <div className="card p-5 border rounded-2xl space-y-6 shadow-sm"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              Interactive Eviction &amp; GC Simulator
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Multi-Tenant Cache Turnover Stress Test
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            High-Churn Cache Dynamics: Garbage Collection Storms vs. Atomic Invalidation
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            KV cache is violently ephemeral: incoming prompts dump gigabytes of tensors, and finishing requests evict them immediately.
            Slide the request rate below to observe how filesystem metadata journals and object store tombstones collapse under churn.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <div className="p-2.5 rounded-xl border flex items-center gap-2 text-xs font-mono font-bold"
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
            <Activity className="w-4 h-4 text-[var(--ddn-red)] animate-pulse" />
            <span>Evictions: <span className="text-[var(--text-primary)]">{metrics.evictionsPerSec.toLocaleString()} /sec</span></span>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Presets */}
      <div className="p-4 rounded-xl border space-y-3"
        style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--text-primary)]" />
            <label htmlFor="churn-slider" className="text-xs font-bold text-[var(--text-primary)]">
              Multi-Tenant Inference Request Rate:
            </label>
            <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded bg-[var(--surface-card)] text-[var(--ddn-red)] border">
              {reqRate.toLocaleString()} req/s
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">Presets:</span>
            <button
              onClick={() => setPreset(2500)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                reqRate === 2500
                  ? 'bg-[var(--ddn-red)] text-white font-bold shadow-sm'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              🏢 Standard RAG (2.5k)
            </button>
            <button
              onClick={() => setPreset(15000)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                reqRate === 15000
                  ? 'bg-[var(--ddn-red)] text-white font-bold shadow-sm'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              🚀 Multi-Tenant Hub (15k)
            </button>
            <button
              onClick={() => setPreset(45000)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                reqRate === 45000
                  ? 'bg-[var(--ddn-red)] text-white font-bold shadow-sm'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              ⚡ Neocloud Churn Storm (45k)
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="pt-1">
          <input
            id="churn-slider"
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={reqRate}
            onChange={(e) => setReqRate(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#ED2738]"
            style={{ background: 'var(--border-default)' }}
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono mt-1">
            <span>1,000 req/s (Light Churn)</span>
            <span>25,000 req/s (Enterprise Load)</span>
            <span>50,000 req/s (Extreme Neocloud Spike)</span>
          </div>
        </div>
      </div>

      {/* Real-time Side-by-Side Stress Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Traditional Filesystem / Element Store */}
        <div className="p-4 rounded-xl border flex flex-col justify-between transition-all"
          style={{
            background: metrics.posix.status.bg,
            borderColor: metrics.ratio > 0.4 ? metrics.posix.status.color : 'var(--border-subtle)',
          }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-[#ED2738]/15 text-[#ED2738]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    POSIX Filesystem &amp; Tombstone Store (WEKA / VAST)
                  </h4>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Unlink Syscalls • Metadata Journaling • GC Compaction
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${metrics.posix.status.color}20`,
                  color: metrics.posix.status.color,
                  border: `1px solid ${metrics.posix.status.color}40`,
                }}>
                {metrics.posix.status.badge}
              </span>
            </div>

            {/* Dynamic Metric 1: P99 Tail Latency */}
            <div className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-[#ED2738]" />
                  P99 Read Latency (TTFT Impact)
                </span>
                <span className="text-sm font-mono font-extrabold" style={{ color: metrics.posix.status.color }}>
                  {metrics.posix.p99 > 1000 ? `${(metrics.posix.p99 / 1000).toFixed(2)} sec` : `${metrics.posix.p99} ms`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{
                    width: `${Math.min(100, Math.max(5, (metrics.posix.p99 / 2000) * 100))}%`,
                    backgroundColor: metrics.posix.status.color,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div className="text-[10px] text-[var(--text-muted)] flex justify-between">
                <span>Baseline: 12.5ms</span>
                <span>{metrics.ratio > 0.5 ? '⚠️ 150x Latency Degradation' : 'Stable'}</span>
              </div>
            </div>

            {/* Dynamic Metric 2: Pending Locks & Tombstones */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#ED2738]" />
                  MDS Lock Queue
                </div>
                <div className="text-sm font-mono font-extrabold text-[var(--text-primary)] mt-0.5">
                  {metrics.posix.locks.toLocaleString()} ops
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  Pending unlink() &amp; journal commits
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-[#ED2738]" />
                  Host CPU Spin
                </div>
                <div className="text-sm font-mono font-extrabold text-[var(--text-primary)] mt-0.5">
                  {metrics.posix.cpu}% load
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  Metadata lock spinning &amp; VFS context switches
                </div>
              </div>
            </div>

            {/* What's Happening Under The Hood */}
            <div className="text-[11px] leading-relaxed text-[var(--text-secondary)] space-y-1.5 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
              <div className="font-bold text-[var(--text-primary)] text-[11px] mb-1">
                Why Filesystems Choke Under Churn:
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#ED2738] font-bold">✕</span>
                <span><strong>MDS Journal Saturation:</strong> Every expired KV block triggers an <code>unlink()</code> syscall, filling filesystem journal buffers.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#ED2738] font-bold">✕</span>
                <span><strong>Garbage Collection (GC) Storms:</strong> Tombstone records accumulate on SSDs, triggering heavy compaction routines that monopolize controller IOPS.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#ED2738] font-bold">✕</span>
                <span><strong>Read Blockade:</strong> GPU worker threads reading prompt prefixes stall behind locked parent directory inodes.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: DDN Infinia Native Distributed KV */}
        <div className="p-4 rounded-xl border flex flex-col justify-between transition-all"
          style={{
            background: 'rgba(0,194,128,0.04)',
            borderColor: 'rgba(0,194,128,0.35)',
          }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-[#00C280]/15 text-[#00C280]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    DDN Infinia Native Distributed KV Substrate
                  </h4>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Atomic O(1) Key Invalidation • Zero Tombstones • Zero GC
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C280]/15 text-[#00C280] border border-[#00C280]/30">
                {metrics.infinia.status.badge}
              </span>
            </div>

            {/* Dynamic Metric 1: P99 Tail Latency */}
            <div className="p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-[#00C280]" />
                  P99 Read Latency (Deterministic TTFT)
                </span>
                <span className="text-sm font-mono font-extrabold text-[#00C280]">
                  {metrics.infinia.p99} ms
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#00C280]"
                  animate={{
                    width: `${Math.min(100, Math.max(3, (metrics.infinia.p99 / 2000) * 100))}%`,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div className="text-[10px] text-[var(--text-muted)] flex justify-between">
                <span>Baseline: 0.82ms</span>
                <span className="text-[#00C280] font-bold">Rock-Solid Flat Latency</span>
              </div>
            </div>

            {/* Dynamic Metric 2: Pending Locks & Tombstones */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#00C280]" />
                  Pending Inode Locks
                </div>
                <div className="text-sm font-mono font-extrabold text-[#00C280] mt-0.5">
                  0 (Zero)
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  No directory hierarchy, no lock queue
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-[#00C280]" />
                  Host CPU Spin
                </div>
                <div className="text-sm font-mono font-extrabold text-[#00C280] mt-0.5">
                  &lt; 1% load
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                  Zero kernel context switches, 100% offload
                </div>
              </div>
            </div>

            {/* What's Happening Under The Hood */}
            <div className="text-[11px] leading-relaxed text-[var(--text-secondary)] space-y-1.5 p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
              <div className="font-bold text-[var(--text-primary)] text-[11px] mb-1">
                How Infinia Eliminates GC Storms:
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#00C280] font-bold">✓</span>
                <span><strong>Atomic In-Memory Invalidation:</strong> Key deletion is an O(1) bit flip in the distributed metadata ring. No unlinks or inode updates.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#00C280] font-bold">✓</span>
                <span><strong>Zero-Tombstone NVMe Recycling:</strong> Storage blocks are immediately freed into raw NVMe block pools without background compaction sweeps.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#00C280] font-bold">✓</span>
                <span><strong>Lock-Free Read/Evict Isolation:</strong> Active GPU KV tensor reads execute over RDMA without any lock contention against concurrent cache evictions.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Callout: Why AI Neoclouds Care */}
      <div className="p-4 rounded-xl border flex items-start gap-3.5"
        style={{
          background: 'linear-gradient(135deg, rgba(237,39,56,0.06) 0%, rgba(245,158,11,0.04) 100%)',
          borderColor: 'var(--border-subtle)',
        }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold bg-[var(--ddn-red)]">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--text-primary)] block mb-0.5">
            The Neocloud SLA Dilemma: Why P99 Tail Latency Kills Inference Economics
          </span>
          In production LLM serving, cache eviction is not an idle nightly task—it occurs continuously across thousands of multi-turn user sessions.
          When a storage system suffers from <strong>1,800ms P99 latency spikes during GC storms</strong>, incoming prompt tokens stall, GPU tensor cores sit idle waiting for cache retrieval,
          and customer <strong>Time-To-First-Token (TTFT) SLAs are breached</strong>.
          DDN Infinia's distributed key-value substrate delivers deterministic sub-millisecond retrieval regardless of eviction velocity.
        </div>
      </div>

    </div>
  )
}
