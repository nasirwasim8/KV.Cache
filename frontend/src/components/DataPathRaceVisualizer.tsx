import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Play, RotateCcw, Zap, Activity,
  Clock, AlertTriangle, Cpu, CheckCircle2,
  HardDrive, Sparkles
} from 'lucide-react'

interface StageDetail {
  id: number
  title: string
  subtitle: string
  posix: {
    name: string
    desc: string
    subtext: string
    latency: string
    overhead: string
    status: 'normal' | 'bottleneck' | 'critical'
  }
  infinia: {
    name: string
    desc: string
    subtext: string
    latency: string
    overhead: string
    status: 'optimal'
  }
}

const STAGES: StageDetail[] = [
  {
    id: 0,
    title: 'Stage 1: Key / Addressing',
    subtitle: 'Token Hash vs. Path Serialization',
    posix: {
      name: 'POSIX Path Serialization',
      desc: 'Converts 256-bit token hash (0x7f9a2b...) into a hierarchical string path (/mnt/kv/tenant_1/llama3/layer_31/chunk_0.bin).',
      subtext: 'String manipulation overhead, memory allocation, POSIX path normalization.',
      latency: '+3.2 ms',
      overhead: 'Host CPU string ops',
      status: 'normal',
    },
    infinia: {
      name: 'Direct 256-bit KV Key',
      desc: 'Raw SHA-256 token hash (0x7f9a2b...) is passed directly as a binary key into Infinia distributed key-value substrate.',
      subtext: 'Zero string translation, zero path hierarchy, zero memory copies.',
      latency: '< 0.05 ms',
      overhead: 'Direct binary key',
      status: 'optimal',
    },
  },
  {
    id: 1,
    title: 'Stage 2: Namespace & Kernel Syscalls',
    subtitle: 'VFS Inode Locking vs. User-Space Bypass',
    posix: {
      name: 'VFS & Inode Lock Contention',
      desc: 'Issues open(), stat(), lseek() syscalls. Metadata Server (MDS) traverses directory tree (O(log N)) and acquires POSIX directory locks.',
      subtext: 'Lock contention: Under multi-GPU concurrency, threads stall waiting on MDS lock serialization.',
      latency: '+14.5 ms',
      overhead: 'MDS Lock Wait + Kernel Syscalls',
      status: 'critical',
    },
    infinia: {
      name: 'NIXL User-Space Direct Bypass',
      desc: 'Bypasses Linux kernel and VFS entirely via NIXL C plugin. Issues direct user-space RPC to storage controller.',
      subtext: 'Zero syscalls, zero context switches, zero directory locks.',
      latency: '< 0.15 ms',
      overhead: 'User-space bypass',
      status: 'optimal',
    },
  },
  {
    id: 2,
    title: 'Stage 3: Storage Lookup & Consistency',
    subtitle: 'Inode Block Mapping vs. O(1) Hash Table',
    posix: {
      name: 'Inode Extent Map & File Locks',
      desc: 'MDS resolves inode extent pointers to physical storage stripes. Holds POSIX read locks and updates atime access attributes.',
      subtext: 'Filesystem journaling overhead and shared lock acquisition.',
      latency: '+11.2 ms',
      overhead: 'Inode traversal + atime locks',
      status: 'bottleneck',
    },
    infinia: {
      name: 'Flat O(1) Distributed Hash Ring',
      desc: 'Storage controller uses deterministic O(1) distributed hash ring to pinpoint exact NVMe target node in microsecond lookup.',
      subtext: 'Zero directory trees, zero inode pointers, lock-free key addressing.',
      latency: '< 0.25 ms',
      overhead: 'Lock-free hash dispatch',
      status: 'optimal',
    },
  },
  {
    id: 3,
    title: 'Stage 4: GPU Memory Ingestion',
    subtitle: 'Multi-Hop Buffer Bounce vs. GPU-Direct RDMA',
    posix: {
      name: 'Host Memory Double-Buffering',
      desc: 'Data copied: NVMe → Host OS Page Cache (Kernel) → User buffer → PCIe Host-to-Device transfer into GPU VRAM.',
      subtext: 'Severe host CPU load (28%), PCIe bus saturation from double-buffer bounce.',
      latency: '+9.5 ms',
      overhead: '28% Host CPU Load + PCIe Bounce',
      status: 'critical',
    },
    infinia: {
      name: 'Zero-Copy GPU-Direct RDMA',
      desc: 'Tensors stream directly from Infinia NVMe-oF over InfiniBand / RoCE directly into GPU HBM (High Bandwidth Memory).',
      subtext: 'Zero host CPU involvement (0% load), zero page cache copies, wire-speed HBM ingestion.',
      latency: '< 0.39 ms',
      overhead: '0% Host CPU (Direct HBM DMA)',
      status: 'optimal',
    },
  },
]

export default function DataPathRaceVisualizer() {
  const [activeStep, setActiveStep] = useState<number>(0)
  const [isRacing, setIsRacing] = useState<boolean>(false)
  const [infiniaStage, setInfiniaStage] = useState<number>(-1)
  const [posixStage, setPosixStage] = useState<number>(-1)
  const [infiniaTime, setInfiniaTime] = useState<number>(0.0)
  const [posixTime, setPosixTime] = useState<number>(0.0)
  const timerRef = useRef<any>(null)

  const handleStartRace = () => {
    setIsRacing(true)
    setInfiniaStage(0)
    setPosixStage(0)
    setInfiniaTime(0.05)
    setPosixTime(3.2)
    setActiveStep(0)

    // Infinia progression (finishes fast: ~1.2s total)
    setTimeout(() => {
      setInfiniaStage(1)
      setInfiniaTime(0.20)
    }, 300)

    setTimeout(() => {
      setInfiniaStage(2)
      setInfiniaTime(0.45)
    }, 600)

    setTimeout(() => {
      setInfiniaStage(3)
      setInfiniaTime(0.84)
    }, 900)

    setTimeout(() => {
      setInfiniaStage(4) // Completed
    }, 1200)

    // POSIX progression (encounters bottlenecks, finishes at ~4.4s)
    setTimeout(() => {
      setPosixStage(1) // Hits Lock contention
      setPosixTime(17.7)
      setActiveStep(1)
    }, 1100)

    setTimeout(() => {
      setPosixStage(2) // Inode extent resolution
      setPosixTime(28.9)
      setActiveStep(2)
    }, 2400)

    setTimeout(() => {
      setPosixStage(3) // Buffer bounce
      setPosixTime(38.4)
      setActiveStep(3)
    }, 3500)

    setTimeout(() => {
      setPosixStage(4) // Completed
      setIsRacing(false)
    }, 4400)
  }

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsRacing(false)
    setInfiniaStage(-1)
    setPosixStage(-1)
    setInfiniaTime(0.0)
    setPosixTime(0.0)
    setActiveStep(0)
  }

  const currentStage = STAGES[activeStep]

  return (
    <div className="card p-5 border rounded-2xl space-y-6 shadow-sm"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: 'rgba(237,39,56,0.1)', color: 'var(--ddn-red)', border: '1px solid rgba(237,39,56,0.25)' }}>
              Interactive Data Path Simulator
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Token Sequence Hash: <code className="text-xs font-mono font-bold text-[var(--text-primary)]">0x7f9a2b8e...</code> (32 MB KV Tensor)
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            The "Two Paths" Data Path Race: POSIX Filesystem vs. DDN Infinia KV Fastpath
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Watch how a single KV chunk travels from storage to GPU HBM. Compare traditional POSIX multi-hop serialization against DDN Infinia direct zero-copy RDMA.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleStartRace}
            disabled={isRacing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--ddn-red)' }}
          >
            {isRacing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Activity className="w-3.5 h-3.5" />
                </motion.div>
                <span>Simulating Race...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Data Path Race</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Race Track / Dual Flow Canvas */}
      <div className="space-y-4">
        {/* Track A: Traditional POSIX Filesystem (WEKA / VAST FS Tier) */}
        <div className="p-4 rounded-xl border transition-all"
          style={{
            background: posixStage >= 1 && posixStage < 4 ? 'rgba(237,39,56,0.03)' : 'var(--surface-secondary)',
            borderColor: posixStage >= 1 && posixStage < 4 ? 'rgba(237,39,56,0.3)' : 'var(--border-subtle)',
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold bg-[#ED2738]/10 text-[#ED2738]">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Path A: Traditional POSIX Filesystem / Element Store (WEKA / VAST)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-card)] text-[var(--text-muted)] border">
                Hierarchical VFS • Inode Locks • Buffer Bounce
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">
                Accumulated Latency:
              </span>
              <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-md bg-[#ED2738]/10 text-[#ED2738] border border-[#ED2738]/20">
                {posixTime > 0 ? `${posixTime.toFixed(1)} ms` : '38.4 ms'}
              </span>
            </div>
          </div>

          {/* 4-Step Track Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 relative">
            {STAGES.map((s, idx) => {
              const isCurrent = posixStage === idx
              const isDone = posixStage > idx
              const hasAlert = s.posix.status === 'critical'

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveStep(idx)}
                  className="p-3 rounded-lg border cursor-pointer transition-all relative overflow-hidden"
                  style={{
                    background: isCurrent
                      ? 'rgba(237,39,56,0.12)'
                      : activeStep === idx
                        ? 'var(--surface-card)'
                        : 'var(--surface-card)',
                    borderColor: isCurrent
                      ? '#ED2738'
                      : activeStep === idx
                        ? 'var(--border-default)'
                        : 'var(--border-subtle)',
                  }}
                >
                  {isCurrent && (
                    <motion.div
                      layoutId="posix-packet"
                      className="absolute top-0 left-0 right-0 h-1 bg-[#ED2738]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                      Stage {idx + 1}
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-bold text-[#ED2738] flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {s.posix.latency}
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-bold text-[#ED2738] animate-pulse">
                        Processing...
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">{s.posix.latency}</span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                    {s.posix.name}
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">
                    {s.posix.overhead}
                  </div>

                  {hasAlert && (
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-[#ED2738]">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      <span>Lock / Kernel Stall</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Posix Status Callout during Race */}
          {isRacing && posixStage === 1 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2.5 p-2 rounded-lg bg-[#ED2738]/10 border border-[#ED2738]/20 flex items-center gap-2 text-xs text-[#ED2738]"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
              <span><strong>MDS Lock Contention:</strong> GPU worker stalled in kernel space waiting for Metadata Server directory lock...</span>
            </motion.div>
          )}
          {isRacing && posixStage === 3 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2.5 p-2 rounded-lg bg-[#ED2738]/10 border border-[#ED2738]/20 flex items-center gap-2 text-xs text-[#ED2738]"
            >
              <Cpu className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span><strong>Double-Buffer Copy:</strong> Host CPU saturated at 28% bouncing bytes from Kernel Page Cache to VRAM...</span>
            </motion.div>
          )}
        </div>

        {/* Track B: DDN Infinia Native Distributed KV + NIXL Fastpath */}
        <div className="p-4 rounded-xl border transition-all"
          style={{
            background: infiniaStage >= 0 && infiniaStage <= 4 ? 'rgba(0,194,128,0.04)' : 'var(--surface-secondary)',
            borderColor: infiniaStage >= 0 && infiniaStage <= 4 ? 'rgba(0,194,128,0.35)' : 'var(--border-subtle)',
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold bg-[#00C280]/15 text-[#00C280]">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Path B: DDN Infinia Native Distributed KV + NIXL Fastpath
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00C280]/15 text-[#00C280] border border-[#00C280]/30">
                Direct KV Substrate • O(1) Lookup • Zero-Copy RDMA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">
                Accumulated Latency:
              </span>
              <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-md bg-[#00C280]/15 text-[#00C280] border border-[#00C280]/30">
                {infiniaTime > 0 ? `${infiniaTime.toFixed(2)} ms` : '0.84 ms'}
              </span>
            </div>
          </div>

          {/* 4-Step Track Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 relative">
            {STAGES.map((s, idx) => {
              const isCurrent = infiniaStage === idx
              const isDone = infiniaStage > idx

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveStep(idx)}
                  className="p-3 rounded-lg border cursor-pointer transition-all relative overflow-hidden"
                  style={{
                    background: isCurrent
                      ? 'rgba(0,194,128,0.15)'
                      : activeStep === idx
                        ? 'var(--surface-card)'
                        : 'var(--surface-card)',
                    borderColor: isCurrent
                      ? '#00C280'
                      : activeStep === idx
                        ? 'var(--border-default)'
                        : 'var(--border-subtle)',
                  }}
                >
                  {isCurrent && (
                    <motion.div
                      layoutId="infinia-packet"
                      className="absolute top-0 left-0 right-0 h-1 bg-[#00C280]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                      Stage {idx + 1}
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-bold text-[#00C280] flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {s.infinia.latency}
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-bold text-[#00C280] animate-pulse">
                        Fastpath...
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">{s.infinia.latency}</span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                    {s.infinia.name}
                  </div>

                  <div className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">
                    {s.infinia.overhead}
                  </div>

                  <div className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-[#00C280]">
                    <Sparkles className="w-2.5 h-2.5 shrink-0" />
                    <span>Hardware Offload</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Infinia Finish Banner */}
          {infiniaStage >= 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2.5 p-2 rounded-lg bg-[#00C280]/10 border border-[#00C280]/30 flex items-center justify-between text-xs text-[#00C280]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-bold">Infinia Completed in 0.84 ms: KV Tensors Ingested Directly into GPU HBM via RoCE/InfiniBand RDMA!</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#00C280]/20 px-2 py-0.5 rounded">0% Host CPU</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Outcome Scorecard Banner */}
      <div className="p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,194,128,0.06) 0%, rgba(237,39,56,0.04) 100%)',
          borderColor: 'var(--border-subtle)',
        }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
            style={{ background: 'var(--ddn-red)' }}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              Simulation Results: Why Native KV Substrate Crushes POSIX Filesystems
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              By removing path serialization, directory locks, and kernel context switches, Infinia eliminates the metadata bottleneck entirely.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Latency Speedup</div>
            <div className="text-base font-extrabold text-[#00C280]">45.7x Faster</div>
            <div className="text-[10px] text-[var(--text-muted)]">0.84ms vs 38.4ms</div>
          </div>
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <div>
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Host CPU Load</div>
            <div className="text-base font-extrabold text-[#00C280]">0% Saturation</div>
            <div className="text-[10px] text-[var(--text-muted)]">vs. 28% on POSIX</div>
          </div>
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <div>
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Kernel Syscalls</div>
            <div className="text-base font-extrabold text-[#00C280]">0 Syscalls</div>
            <div className="text-[10px] text-[var(--text-muted)]">Pure User-Space RDMA</div>
          </div>
        </div>
      </div>

      {/* Interactive Step Deep-Dive Inspector */}
      <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Step-by-Step Architectural Inspection:
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Click any stage tab below to inspect the microscopic data path differences.
            </span>
          </div>
          <div className="flex items-center gap-1">
            {STAGES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeStep === idx
                    ? 'bg-[var(--ddn-red)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                }`}
              >
                Stage {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Stage Side-by-Side Deep Dive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Posix Side */}
          <div className="p-3.5 rounded-xl border"
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#ED2738] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                POSIX Filesystem (WEKA / VAST FS)
              </span>
              <span className="text-[11px] font-mono font-bold text-[#ED2738]">
                {currentStage.posix.latency}
              </span>
            </div>
            <h5 className="text-xs font-bold text-[var(--text-primary)] mb-1">
              {currentStage.posix.name}
            </h5>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {currentStage.posix.desc}
            </p>
            <div className="mt-2.5 pt-2 border-t text-[11px] text-[var(--text-muted)]" style={{ borderColor: 'var(--border-subtle)' }}>
              <strong>Mechanical Bottleneck:</strong> {currentStage.posix.subtext}
            </div>
          </div>

          {/* Infinia Side */}
          <div className="p-3.5 rounded-xl border"
            style={{ background: 'rgba(0,194,128,0.03)', borderColor: 'rgba(0,194,128,0.25)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#00C280] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                DDN Infinia Native KV + NIXL
              </span>
              <span className="text-[11px] font-mono font-bold text-[#00C280]">
                {currentStage.infinia.latency}
              </span>
            </div>
            <h5 className="text-xs font-bold text-[var(--text-primary)] mb-1">
              {currentStage.infinia.name}
            </h5>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {currentStage.infinia.desc}
            </p>
            <div className="mt-2.5 pt-2 border-t text-[11px] text-[var(--text-muted)]" style={{ borderColor: 'rgba(0,194,128,0.2)' }}>
              <strong>Architectural Edge:</strong> {currentStage.infinia.subtext}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
