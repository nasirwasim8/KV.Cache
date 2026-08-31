import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronRight, CheckCircle, Zap, Database, Server,
  MemoryStick, Users, Layers, ArrowRight, AlertTriangle, HardDrive,
  TrendingDown, Shield, Eye, EyeOff, GitBranch, Lock, Hash, Activity
} from 'lucide-react'

// ─── Shared sub-components (mirrors RAG/VSS Details pattern) ──────────────────

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{
        background: color ? `${color}18` : 'var(--surface-secondary)',
        color: color ?? 'var(--text-muted)',
        border: `1px solid ${color ? `${color}30` : 'var(--border-subtle)'}`,
      }}>
      {children}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
      style={{ color: 'var(--text-primary)' }}>
      {children}
    </h3>
  )
}

function TalkingPoint({ icon: _icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="p-3 rounded-xl border"
      style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
    </div>
  )
}

// ─── Expandable pipeline stage row (VSS-style numbered rows) ──────────────────

function StageRow({ n, icon, label, who, detail, color, last = false }: {
  n: number; icon: React.ReactNode; label: string; who: string; detail: string
  color: string; last?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all"
        style={{
          background: open ? `${color}08` : 'var(--surface-secondary)',
          borderColor: open ? `${color}40` : 'var(--border-subtle)',
        }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          style={{ background: color }}>{n}</div>
        <span style={{ color }}>{icon}</span>
        <span className="font-medium text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="text-[10px] px-2 py-0.5 rounded font-mono hidden md:inline"
          style={{ background: 'var(--surface-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          {who}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
      </button>

      {!last && !open && (
        <div className="flex items-center justify-center py-0.5">
          <ArrowRight className="w-3 h-3 rotate-90" style={{ color: 'var(--border-default)' }} />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mx-4 mt-2 mb-3 p-3 rounded-xl text-xs leading-relaxed"
              style={{ background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              {detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 1 — KV Cache Mechanics
// ═══════════════════════════════════════════════════════════════════

function KVMechanicsDetail() {
  const PHASES = [
    {
      n: 1, label: 'PREFILL — Input Processing', who: 'GPU (parallelizable)', color: '#ED2738',
      icon: <Zap className="w-4 h-4" />,
      detail: 'ALL input tokens are processed simultaneously in parallel. For a 50,000-token system prompt, the GPU computes Key and Value matrices for all 50,000 tokens at once. This phase is extremely GPU-intensive and is the primary cost driver in inference. This is exactly what KV Cache eliminates on repeat requests.',
    },
    {
      n: 2, label: 'K/V MATRICES STORED → DDN Infinia', who: 'S3 PUT (real object store)', color: '#ED2738',
      icon: <HardDrive className="w-4 h-4" />,
      detail: 'After prefill, the computed Key (K) and Value (V) attention matrices are serialised and uploaded to DDN Infinia via a real S3 PUT operation. Latency: 10–80ms depending on payload size. These matrices encode the model\'s full "understanding" of the system prompt. They do NOT include the output — only the input computation.',
    },
    {
      n: 3, label: 'CACHE HIT — K/V Retrieved from Infinia', who: 'S3 GET (~10–80ms)', color: '#00C280',
      icon: <Database className="w-4 h-4" />,
      detail: 'On a repeat request (same system prompt), instead of recomputing 50,000 tokens, the backend fetches the stored K/V matrices from Infinia. The GPU receives the cached state and skips directly to processing only the new query tokens. This is a real S3 GET — the latency shown in the demo is measured wall-clock time.',
    },
    {
      n: 4, label: 'DECODE — Output Generation', who: 'GPU (sequential, always runs)', color: '#76B900',
      icon: <BookOpen className="w-4 h-4" />,
      detail: 'Output tokens are generated one at a time, each attending to all previous K/V pairs. This phase is inherently sequential and cannot be parallelised (autoregressive). KV Cache does NOT accelerate decode — it only eliminates the prefill cost. Decode speed is the same with or without caching.',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Core principle */}
      <div className="p-4 rounded-2xl border" style={{ background: 'rgba(237,39,56,0.05)', borderColor: 'rgba(237,39,56,0.2)' }}>
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--ddn-red)' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--ddn-red)' }}>
              Core Principle — Every skipped prefill token is GPU compute you keep
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              An LLM request has two phases: <strong>prefill</strong> (expensive, parallel, cacheable)
              and <strong>decode</strong> (sequential, always runs). KV Cache targets only the prefill phase.
              With a 50,000-token system prompt, caching eliminates 99%+ of input compute on every repeat request.
            </p>
          </div>
        </div>
      </div>

      {/* What K, V, Q are */}
      <div>
        <SectionTitle><Layers className="w-4 h-4" style={{ color: 'var(--ddn-red)' }} /> Inside the Attention Mechanism</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Q — Query', emoji: '❓', color: '#807778', desc: 'NOT cached', note: 'Computed fresh for each new token. Represents "what am I looking for?" at this position.' },
            { label: 'K — Key', emoji: '🔑', color: '#00C280', desc: 'CACHED in Infinia', note: '"What information does this token contain?" — computed once per token, stored forever.' },
            { label: 'V — Value', emoji: '📦', color: '#00C280', desc: 'CACHED in Infinia', note: '"The actual content/meaning of this token" — retrieved via attention weights.' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-xl border text-center"
              style={{ borderColor: `${m.color}40`, background: `${m.color}08` }}>
              <div className="text-2xl mb-2">{m.emoji}</div>
              <div className="text-sm font-bold mb-1" style={{ color: m.color }}>{m.label}</div>
              <div className="text-xs font-semibold" style={{ color: m.color }}>{m.desc}</div>
              <div className="text-xs mt-2 leading-snug" style={{ color: 'var(--text-muted)' }}>{m.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4-stage pipeline */}
      <div>
        <SectionTitle><Layers className="w-4 h-4" style={{ color: 'var(--ddn-red)' }} /> 4-Stage Request Lifecycle</SectionTitle>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Click any stage to see what happens at that exact point.</p>
        <div className="flex flex-col gap-1">
          {PHASES.map((p, i) => (
            <StageRow key={p.n} {...p} last={i === PHASES.length - 1} />
          ))}
        </div>
      </div>

      {/* Talking points */}
      <div>
        <SectionTitle><Zap className="w-4 h-4" style={{ color: '#00C280' }} /> Why This Matters</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="⚡" title="Only prefill is expensive" body="Output generation always runs sequentially regardless of caching. The entire value of KV Cache is in eliminating the parallel prefill recomputation." />
          <TalkingPoint icon="🔑" title="K and V are what's stored" body="Not the full model weights, not the output — just the intermediate attention matrices for the input tokens. These are the exact values the GPU would have recomputed." />
          <TalkingPoint icon="📡" title="Real S3 PUT/GET operations" body="This demo makes real HTTP calls to DDN Infinia. Every latency number shown is measured wall-clock time — not simulated or estimated." />
          <TalkingPoint icon="📐" title="Size scales with context" body="A 50,000-token system prompt generates roughly 50,000 K/V pairs per attention head. For Llama 3.2 3B with 28 heads × 2 (K+V) × 4 bytes, that's ~11MB per request." />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 2 — Multi-Turn Walkthrough
// ═══════════════════════════════════════════════════════════════════

function MultiTurnDetail() {
  const TURNS = [
    {
      n: 1, label: 'Turn 1 — Cache MISS (First Request)', color: '#ED2738',
      icon: <Database className="w-4 h-4" />, who: 'Full prefill compute',
      detail: 'GPU processes all tokens from scratch: system prompt (~50K tokens) + user question (~10 tokens). K/V matrices for all 50,010 tokens computed in parallel. Result stored in DDN Infinia via S3 PUT. Cost: 50,010 input tokens billed at full rate.',
    },
    {
      n: 2, label: 'Turn 2 — Cache HIT (Same Question)', color: '#00C280',
      icon: <Zap className="w-4 h-4" />, who: 'Infinia S3 GET + skip prefill',
      detail: 'K/V matrices fetched from Infinia (real S3 GET, measured ~10–80ms). GPU skips 50,000-token prefill entirely. Only the 10-token new question is processed. Cost: 10 input tokens only. System prompt tokens = FREE (self-hosted) or ~99% discount (cloud API).',
    },
    {
      n: 3, label: 'Turn N — Savings Compound', color: '#1A81AF',
      icon: <TrendingDown className="w-4 h-4" />, who: 'Near-zero input cost per turn',
      detail: 'Each conversation turn adds only the new question tokens. Accumulated history grows in Infinia but is retrieved rather than recomputed. By Turn 10: 98%+ of input tokens are cached. By Turn 50: ~99% of input compute is eliminated. The longer the conversation, the greater the savings.',
    },
    {
      n: 4, label: 'Cross-User Prefix Sharing', color: '#76B900',
      icon: <Users className="w-4 h-4" />, who: 'Prefix Multiplier pattern',
      detail: 'If 1,000 users all query the same Contact Center AI (same system prompt), the system prompt K/V is computed ONCE and shared across all users. Each user\'s session only adds their own conversation history. This is the Prefix Multiplier: 1 computation × 1,000 users = 1,000× effective throughput gain.',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Core principle */}
      <div className="p-4 rounded-2xl border" style={{ background: 'rgba(0,194,128,0.05)', borderColor: 'rgba(0,194,128,0.2)' }}>
        <div className="flex items-start gap-3">
          <TrendingDown className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#00C280' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: '#00C280' }}>
              Core Principle — The first request pays the price, every repeat is nearly free
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Token cost follows a steep decay curve. Turn 1 is full price. Turn 2 costs only the new question.
              Turn 50 costs ~1% of Turn 1. The left panel (no cache) is a <strong>leaking bucket</strong> — grows unbounded.
              The right panel (Infinia) is a <strong>flat line</strong> — always just the new words you typed.
            </p>
          </div>
        </div>
      </div>

      {/* Cost trajectory bars */}
      <div>
        <SectionTitle><TrendingDown className="w-4 h-4" style={{ color: '#00C280' }} /> Cost Per Turn (Relative to Turn 1)</SectionTitle>
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-end gap-2 mb-2" style={{ height: '72px' }}>
            {[
              { label: 'T1', pct: 100, color: '#ED2738', note: '100%' },
              { label: 'T2', pct: 15,  color: '#FF7600', note: '15%' },
              { label: 'T3', pct: 8,   color: '#00C280', note: '8%' },
              { label: 'T4', pct: 5,   color: '#00C280', note: '5%' },
              { label: 'T5', pct: 4,   color: '#00C280', note: '4%' },
              { label: 'T10', pct: 2,  color: '#00C280', note: '2%' },
              { label: 'T50', pct: 1,  color: '#00C280', note: '~1%' },
            ].map(bar => (
              <div key={bar.label} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                <div className="text-xs font-mono font-bold" style={{ color: bar.color, fontSize: '9px', marginBottom: '2px' }}>{bar.note}</div>
                <div className="w-full rounded-t-lg" style={{ height: `${Math.max(bar.pct * 0.62, 3)}px`, background: bar.color }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {['T1','T2','T3','T4','T5','T10','T50'].map(t => (
              <div key={t} className="flex-1 text-center font-bold" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t}</div>
            ))}
          </div>
          <div className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            85% saved at T2 · 92% at T3 · ~99% at T50
          </div>
        </div>
      </div>

      {/* 4-turn pipeline */}
      <div>
        <SectionTitle><Layers className="w-4 h-4" style={{ color: '#00C280' }} /> Turn-by-Turn Pipeline</SectionTitle>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Click any turn to see exactly what the GPU does and what you pay.</p>
        <div className="flex flex-col gap-1">
          {TURNS.map((t, i) => <StageRow key={t.n} {...t} last={i === TURNS.length - 1} />)}
        </div>
      </div>

      {/* Token growth table */}
      <div>
        <SectionTitle><Database className="w-4 h-4" style={{ color: '#1A81AF' }} /> The Leaking Bucket vs Flat Line</SectionTitle>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface-secondary)' }}>
                <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Turn</th>
                <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Question Asked</th>
                <th className="px-3 py-2.5 text-center font-semibold" style={{ color: '#ED2738' }}>❌ Without Cache</th>
                <th className="px-3 py-2.5 text-center font-semibold" style={{ color: '#00C280' }}>✅ With Infinia</th>
              </tr>
            </thead>
            <tbody>
              {[
                { turn: 'Turn 1', q: '"What is DDN Infinia?"',        left: '50,005 tokens',          right: '5 tokens',   hit: false },
                { turn: 'Turn 2', q: '"Tell me more about it"',       left: '50,005 + reply + 10',    right: '10 tokens',  hit: false },
                { turn: 'Turn 3', q: '"What is DDN Infinia?" (again)',left: '50,005 + replies + 5',   right: '⚡ HIT',     hit: true  },
                { turn: 'Turn N', q: 'Any previously asked question', left: 'Growing unbounded →∞',   right: '⚡ HIT',     hit: true  },
              ].map((row, i) => (
                <tr key={i} style={{ background: row.hit ? 'rgba(0,194,128,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--surface-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.turn}</td>
                  <td className="px-3 py-2.5 italic" style={{ color: 'var(--text-secondary)' }}>{row.q}</td>
                  <td className="px-3 py-2.5 text-center font-mono" style={{ color: '#ED2738' }}>{row.left}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold" style={{ color: row.hit ? '#00C280' : 'var(--text-secondary)' }}>{row.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Talking points */}
      <div>
        <SectionTitle><CheckCircle className="w-4 h-4" style={{ color: '#00C280' }} /> Key Insights</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="📉" title="The leaking bucket analogy" body="Without caching, every turn sends the entire conversation history to the GPU. Token count grows with every message — so does cost and latency." />
          <TalkingPoint icon="📏" title="The flat line with Infinia" body="With caching, each turn only sends the new question. Token count stays constant regardless of conversation length." />
          <TalkingPoint icon="👥" title="Prefix sharing across users" body="1,000 users querying the same Contact Center AI share one system prompt computation. That's 1,000× effective throughput from a single prefill." />
          <TalkingPoint icon="💰" title="Cloud API billing impact" body="On GPT-4o or Azure A100, every cached token is a direct invoice reduction. At 500K requests/day with a 50K-token prompt, caching saves millions of dollars annually." />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 3 — Session Resume
// ═══════════════════════════════════════════════════════════════════

function SessionResumeDetail() {
  const STAGES_WITHOUT = [
    { n: 1, label: 'User sends Turn 1–3', who: 'GPU HBM', color: '#807778', icon: <ArrowRight className="w-4 h-4" />, detail: 'GPU computes normally. KV state lives in GPU HBM (High-Bandwidth Memory). Everything is fast while the session is active and memory is available.' },
    { n: 2, label: 'GPU serves 1,000 other users', who: 'Memory pressure event', color: '#ED2738', icon: <AlertTriangle className="w-4 h-4" />, detail: 'The GPU is serving thousands of concurrent sessions. Under memory pressure, the LRU eviction policy removes older KV states to free VRAM for active sessions. Your conversation state is silently deleted from GPU memory.' },
    { n: 3, label: 'User returns and asks Turn 4', who: 'GPU re-computes everything', color: '#ED2738', icon: <Zap className="w-4 h-4" />, detail: 'Without external storage, the entire conversation history (Turns 1–3 + all system prompts) must be re-processed from scratch. This can be 10,000+ tokens = 3–8 seconds of wasted GPU time. The user experiences a degraded, slow response. This happens silently — the user has no idea why.' },
  ]

  const STAGES_WITH = [
    { n: 1, label: 'User sends Turn 1–3', who: 'GPU HBM + Infinia', color: '#807778', icon: <ArrowRight className="w-4 h-4" />, detail: 'Same as without — GPU computes normally. But every KV state is also persisted to DDN Infinia as a background S3 PUT. The user never sees this latency overhead.' },
    { n: 2, label: 'GPU eviction event', who: 'Safe eviction', color: '#00C280', icon: <Shield className="w-4 h-4" />, detail: 'GPU evicts the session from HBM as before. But before eviction, the full KV state was already safely written to Infinia. The GPU simply notes: "session state is in Infinia" and frees the VRAM.' },
    { n: 3, label: 'User returns — KV loaded from Infinia', who: 'S3 GET ~50ms', color: '#00C280', icon: <HardDrive className="w-4 h-4" />, detail: 'When the user sends Turn 4, the backend detects the session is not in GPU HBM. It fetches the KV state from Infinia (real S3 GET, ~50ms). The GPU resumes exactly where it left off — no recomputation. Turn 4 only processes the new question.' },
  ]

  return (
    <div className="space-y-8">
      {/* Core principle */}
      <div className="p-4 rounded-2xl border" style={{ background: 'rgba(26,129,175,0.05)', borderColor: 'rgba(26,129,175,0.2)' }}>
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#1A81AF' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: '#1A81AF' }}>
              Core Principle — GPU memory is volatile. Infinia is permanent.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              In enterprise AI, a single GPU serves <strong>thousands of concurrent sessions</strong>.
              Under memory pressure, it silently evicts older sessions. Without external KV storage,
              users pay the full recomputation cost on every eviction. With Infinia, context survives
              GPU restarts, scaling events, and failures — resuming in ~50ms instead of 3–8 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '⏱️', stat: '3–8 sec', label: 'Wasted per return', sub: 'Without Infinia — GPU re-reads all history', color: '#ED2738' },
          { icon: '⚡', stat: '~50 ms', label: 'Session resume', sub: 'With Infinia — context loaded from object store', color: '#00C280' },
          { icon: '♾️', stat: '∞ Users', label: 'Concurrent sessions', sub: "Each user's context lives in Infinia, not GPU RAM", color: '#1A81AF' },
        ].map(item => (
          <div key={item.label} className="text-center p-3 rounded-xl"
            style={{ background: `${item.color}0c`, border: `1px solid ${item.color}25` }}>
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="font-mono font-black text-lg" style={{ color: item.color }}>{item.stat}</div>
            <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{item.label}</div>
            <div className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Two pipelines side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: '#ED2738' }}>
            ❌ Without External KV Cache
          </div>
          <div className="flex flex-col gap-1">
            {STAGES_WITHOUT.map((s, i) => <StageRow key={s.n} {...s} last={i === STAGES_WITHOUT.length - 1} />)}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: '#00C280' }}>
            ✅ With DDN Infinia
          </div>
          <div className="flex flex-col gap-1">
            {STAGES_WITH.map((s, i) => <StageRow key={s.n} {...s} last={i === STAGES_WITH.length - 1} />)}
          </div>
        </div>
      </div>

      {/* Talking points */}
      <div>
        <SectionTitle><Shield className="w-4 h-4" style={{ color: '#00C280' }} /> Executive Highlights</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="🧠" title="GPU HBM is the bottleneck" body="High-Bandwidth Memory on an H100 is ~80GB — shared between model weights, KV cache, and activations. In multi-user serving, KV cache competes with model weights for the same VRAM pool." />
          <TalkingPoint icon="🔄" title="Eviction is silent and constant" body="Under typical production load, KV eviction happens continuously. Users don't see an error — they just get a slow response as the GPU recomputes from scratch." />
          <TalkingPoint icon="🛡️" title="Infinia survives infrastructure events" body="GPU restart, OOM kill, node failure, auto-scaling — in any event, the KV state in Infinia survives. The next GPU to serve the user picks up the same state." />
          <TalkingPoint icon="🏢" title="This is the enterprise differentiator" body="Single-GPU demos never show this failure mode. In production with thousands of concurrent users, KV eviction is not a corner case — it's the default state." />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 4 — GPU vs Infinia Storage
// ═══════════════════════════════════════════════════════════════════

function StorageComparisonDetail() {
  const ROWS = [
    { metric: 'Capacity', gpu: '~2–8 GB (shares VRAM with model weights)', infinia: 'Petabytes — unlimited sessions', winner: 'infinia' },
    { metric: 'Speed (read)', gpu: '< 1ms (on-chip HBM)', infinia: '10–80ms (network S3 GET)', winner: 'gpu' },
    { metric: 'Persistence', gpu: '❌ Lost on restart / GPU OOM', infinia: '✅ Persistent — survives any event', winner: 'infinia' },
    { metric: 'Multi-node sharing', gpu: 'Single GPU only', infinia: 'Shared across ALL GPU nodes in cluster', winner: 'infinia' },
    { metric: 'Cost', gpu: 'Competes with model weights for VRAM', infinia: '$0.023/GB/month (object store pricing)', winner: 'infinia' },
    { metric: 'Concurrent sessions', gpu: 'Dozens (VRAM-limited)', infinia: 'Millions', winner: 'infinia' },
    { metric: 'Eviction policy', gpu: 'LRU — silent, uncontrolled', infinia: 'No eviction — explicit lifecycle', winner: 'infinia' },
    { metric: 'Best for', gpu: 'Single active session, real-time streaming', infinia: 'Enterprise scale, multi-user, multi-GPU', winner: 'infinia' },
  ]

  return (
    <div className="space-y-8">
      {/* Core principle */}
      <div className="p-4 rounded-2xl border" style={{ background: 'rgba(118,185,0,0.05)', borderColor: 'rgba(118,185,0,0.2)' }}>
        <div className="flex items-start gap-3">
          <HardDrive className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#76B900' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: '#76B900' }}>
              Core Principle — Speed on-chip. Scale in Infinia.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              GPU HBM is fast but <strong>finite and volatile</strong>. DDN Infinia is 10–80ms slower per lookup,
              but provides <strong>unlimited, persistent, shared</strong> KV storage across your entire GPU cluster.
              At scale (50K+ requests/day), the 70ms read overhead is negligible compared to the
              4,000ms+ prefill cost it eliminates.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div>
        <SectionTitle><Server className="w-4 h-4" style={{ color: '#1A81AF' }} /> Side-by-Side Comparison</SectionTitle>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface-secondary)' }}>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Feature</th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: '#76B900' }}>GPU VRAM Cache</th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: '#ED2738' }}>DDN Infinia</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.metric} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.metric}</td>
                  <td className="px-4 py-3 text-center" style={{ color: row.winner === 'gpu' ? '#76B900' : 'var(--text-secondary)', background: row.winner === 'gpu' ? 'rgba(118,185,0,0.06)' : undefined }}>
                    {row.winner === 'gpu' && <span className="mr-1">⭐</span>}{row.gpu}
                  </td>
                  <td className="px-4 py-3 text-center font-medium" style={{ color: row.winner === 'infinia' ? '#ED2738' : 'var(--text-secondary)', background: row.winner === 'infinia' ? 'rgba(237,39,56,0.04)' : undefined }}>
                    {row.winner === 'infinia' && <span className="mr-1">⭐</span>}{row.infinia}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(237,39,56,0.05)', border: '1px solid rgba(237,39,56,0.15)' }}>
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>🏆 Bottom line for enterprise AI:</div>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The 70ms Infinia read overhead is paid <strong>once per session resume</strong>. The alternative
            — GPU recomputing 50,000 tokens — takes <strong>4,000–8,000ms</strong>. Infinia is 100× faster
            than the failure mode it prevents.
          </div>
        </div>
      </div>

      {/* Talking points */}
      <div>
        <SectionTitle><Database className="w-4 h-4" style={{ color: '#00C280' }} /> The Business Case</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="⚡" title="70ms vs 4,000ms" body="The Infinia read overhead is 70ms. The prefill cost it avoids is 4,000–8,000ms. The tradeoff is 57× in your favour on every cache hit." />
          <TalkingPoint icon="🔗" title="Cross-GPU sharing is the key" body="GPU VRAM can't be shared between nodes. Infinia is a shared object store — any GPU in the cluster can serve any user's session without recomputation." />
          <TalkingPoint icon="💾" title="Storage cost is negligible" body="An 11MB KV state stored for 24 hours costs ~$0.000007. GPU VRAM costs $2.80/hour to run — and it can only hold dozens of sessions simultaneously." />
          <TalkingPoint icon="📈" title="Scales with your fleet" body="As you add GPU nodes, each one gains instant access to all cached sessions in Infinia. No warm-up, no replication, no coordination overhead." />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 5 — Who Benefits (ICP)
// ═══════════════════════════════════════════════════════════════════

function ICPDetail() {
  const ICPS = [
    {
      n: 1, label: 'MLOps / Infra Engineers', who: 'GPU utilization & cost per request', color: '#1A81AF',
      icon: <Server className="w-4 h-4" />,
      detail: 'MLOps engineers care about GPU efficiency metrics: tokens/second, utilization%, cost/request. The demo shows concrete reduction in tokens processed per request and the before/after TTFT numbers. KV Cache directly reduces GPU cycles per turn — a metric they already track.',
    },
    {
      n: 2, label: 'CTOs / VP Engineering', who: 'Infrastructure budget & scale', color: '#ED2738',
      icon: <TrendingDown className="w-4 h-4" />,
      detail: 'C-level executives need CapEx and OpEx numbers. The ROI Calculator translates token savings into DGX servers avoided ($300K each), power savings (kWh/year), and throughput multipliers (92× more users from same hardware). These are CFO-level conversations.',
    },
    {
      n: 3, label: 'AI Product Managers', who: 'User experience & latency', color: '#00C280',
      icon: <Zap className="w-4 h-4" />,
      detail: 'Product managers measure TTFT (time-to-first-token) as a core UX metric. Sub-100ms TTFT on repeated queries feels instant to users. The Chat Observatory shows this in real-time — same question, 10× faster response on the second ask.',
    },
    {
      n: 4, label: 'AI Platform Engineers', who: 'vLLM prefix caching at enterprise scale', color: '#76B900',
      icon: <Database className="w-4 h-4" />,
      detail: 'Platform engineers building on vLLM or TensorRT-LLM already know about prefix caching. The DDN story is: "Infinia replaces ephemeral GPU HBM with a persistent, shared object store that survives scaling events and serves your entire GPU fleet." This is a direct architectural upgrade to what they\'re already building.',
    },
    {
      n: 5, label: 'Finance / Procurement', who: 'Cloud vs on-prem ROI', color: '#f59e0b',
      icon: <Users className="w-4 h-4" />,
      detail: 'Finance needs hard numbers with verifiable assumptions. The ROI Calculator shows the exact formula behind every KPI: servers avoided = ⌈requests/200K⌉ before caching minus after caching. Each assumption (DGX price, power draw, electricity rate) is visible and adjustable.',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Core principle */}
      <div className="p-4 rounded-2xl border" style={{ background: 'rgba(26,129,175,0.05)', borderColor: 'rgba(26,129,175,0.2)' }}>
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#1A81AF' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: '#1A81AF' }}>
              Core Principle — Every persona sees a different ROI, all from the same demo
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The same Chat Observatory demo lands differently depending on who is watching.
              Lead with the metric that resonates with each audience — then use the ROI Calculator
              to translate it into their language. The technology is the same; the story changes.
            </p>
          </div>
        </div>
      </div>

      {/* ICP pipeline (clickable) */}
      <div>
        <SectionTitle><Users className="w-4 h-4" style={{ color: '#1A81AF' }} /> Who Benefits Most — Ideal Customer Profiles</SectionTitle>
        <div className="flex flex-col gap-1">
          {ICPS.map((icp, i) => <StageRow key={icp.n} {...icp} last={i === ICPS.length - 1} />)}
        </div>
      </div>

      {/* Demo route by persona */}
      <div>
        <SectionTitle><ArrowRight className="w-4 h-4" style={{ color: '#76B900' }} /> Recommended Demo Route by Audience</SectionTitle>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface-secondary)' }}>
                <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Audience</th>
                <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Lead With</th>
                <th className="px-3 py-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Close With</th>
              </tr>
            </thead>
            <tbody>
              {[
                { audience: 'MLOps / Infra', lead: 'Token count comparison (Chat Observatory)', close: 'GPU-hours freed/year (ROI Calculator)', color: '#1A81AF' },
                { audience: 'CTO / VP Eng', lead: 'Throughput multiplier (92×)', close: 'CapEx avoided ($300K per DGX)', color: '#ED2738' },
                { audience: 'AI Product', lead: 'TTFT difference on HIT vs MISS', close: 'Session Resume — GPU flush & restore', color: '#00C280' },
                { audience: 'Platform Eng', lead: 'Session Resume flow (technical)', close: 'Prefix Multiplier (shared system prompt)', color: '#76B900' },
                { audience: 'Finance', lead: 'ROI Calculator — Contact Center preset', close: 'Combined Annual Value formula', color: '#f59e0b' },
              ].map((row, i) => (
                <tr key={row.audience} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: row.color }}>{row.audience}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{row.lead}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{row.close}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Talking points */}
      <div>
        <SectionTitle><ArrowRight className="w-4 h-4" style={{ color: '#00C280' }} /> Core Messaging</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="🎯" title="Lead with useful tokens/second" body="Not tokens/second — useful tokens/second. How much of your GPU's compute is generating new value vs re-reading context it already knows? That ratio is determined by your data architecture." />
          <TalkingPoint icon="📊" title="Everything in this demo is live" body="Real S3 GET/PUT to DDN Infinia. Real Ollama inference. Real latency measurement. Every number on screen is measured — not simulated, not estimated." />
          <TalkingPoint icon="🔢" title="The ROI Calculator is adjustable" body="Every assumption is visible and slider-controlled. Let the customer set their own numbers — the formula is transparent. This builds trust faster than a fixed slide." />
          <TalkingPoint icon="🏢" title="Contact Center AI is the most relatable" body="50,000-token policy manual, 500K queries/day, 85% hit rate — every enterprise audience understands call center operations. Start here before moving to legal or healthcare." />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CONCEPTS registry + Main Page
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// SECTION — Dynamo + LMCache Architecture
// ═══════════════════════════════════════════════════════════════════

function DynamoNIXLArchitectureDetail() {
  return (
    <div className="space-y-6">

      {/* Live inline architecture diagram */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #0a0a0f 0%, #0f1a0f 100%)' }}>
          <span style={{ color: '#76B900', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>STACK ARCHITECTURE</span>
          <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>NVIDIA Dynamo · vLLM · LMCache · DDN Infinia</span>
        </div>
        {/* Inline diagram */}
        <div style={{ background: '#0D0C0C', padding: '28px 24px', fontFamily: 'var(--font-mono, monospace)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>DDN Infinia KV Cache Stack</span>
          </div>
          {/* Top row: AIperf + User */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {[{ label: 'NVIDIA Alperf', sub: 'Benchmark Workload Generator', color: '#1A81AF' },
              { label: 'User / Application', sub: 'LLM API Requests', color: '#555' }].map(b => (
              <div key={b.label} style={{ flex: 1, border: `1px solid ${b.color}`, borderRadius: 6, padding: '10px 14px', background: `${b.color}18` }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{b.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>{b.sub}</div>
              </div>
            ))}
          </div>
          {/* Arrow */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 6 }}>↓</div>
          {/* Dynamo */}
          <div style={{ border: '1px solid #76B900', borderRadius: 6, padding: '10px 14px', marginBottom: 12, background: '#76B90012' }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>NVIDIA Dynamo</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>Inference Serving Framework · Request Routing · KV-Aware Scheduling · Worker Orchestration</div>
          </div>
          {/* Arrow */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 6 }}>↓</div>
          {/* vLLM + HBM row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'stretch' }}>
            <div style={{ flex: 2, border: '1px solid #444', borderRadius: 6, padding: '10px 14px', background: '#ffffff0a' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>vLLM Engine <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 400 }}>vLLM 0.26+</span></div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>Open-source LLM Serving · Llama 3.1 8B · Prefix Caching · PagedAttention</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0, gap: 4 }}>
              <span>K/V</span><br/><span>Tensors</span>
            </div>
            <div style={{ flex: 1, border: '1px solid #ED2738', borderRadius: 6, padding: '10px 14px', background: '#ED273812' }}>
              <div style={{ color: '#ED2738', fontWeight: 600, fontSize: 12 }}>GPU HBM (24 GB)</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3 }}>Active KV Cache · Fast but Volatile · Evicted on OOM</div>
            </div>
          </div>
          {/* LMCache arrow */}
          <div style={{ textAlign: 'center', color: '#76B900', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>↓ KV Transfer via LMCache</div>
          {/* LMCache */}
          <div style={{ border: '2px solid #76B900', borderRadius: 6, padding: '10px 14px', marginBottom: 12, background: '#76B90018', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, right: 12, background: '#76B900', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#000', fontWeight: 700 }}>LIVE</div>
            <div style={{ color: '#76B900', fontWeight: 700, fontSize: 13 }}>LMCache</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 3 }}>CPU Staging Buffer (0.5 GB) · S3 Connector · bfloat16 KV Chunks (32 MB each) · Prefix Hash Lookup · vLLM KVConnectorV1</div>
          </div>
          {/* Infinia arrow */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 6 }}>↓ Persist / Fetch</div>
          {/* Infinia */}
          <div style={{ border: '1px solid #ED2738', borderRadius: 6, padding: '10px 14px', background: '#ED273812' }}>
            <div style={{ color: '#ED2738', fontWeight: 600, fontSize: 13 }}>DDN Infinia</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>Persistent AI Memory · KV Cache Object Store · S3-Compatible · Sub-10ms Retrieval · Survives GPU Restarts</div>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            name: 'NVIDIA AIperf',
            color: '#1A81AF',
            role: 'Benchmark Workload Generator',
            detail: 'Open-source tool from NVIDIA for benchmarking LLM inference throughput and latency. Generates realistic multi-user request patterns and measures TTFT, ITL, and token throughput. Used in this demo to drive load against the full Dynamo + vLLM stack.',
          },
          {
            name: 'NVIDIA Dynamo',
            color: '#76B900',
            role: 'Inference Serving Framework',
            detail: 'NVIDIA\'s open-source inference serving runtime. Handles request routing, KV-aware scheduling (routes requests to workers that already hold the relevant KV cache), worker orchestration, and disaggregated prefill/decode. Designed specifically to maximize KV cache reuse across GPU workers.',
          },
          {
            name: 'vLLM Engine',
            color: '#64B5F6',
            role: 'LLM Serving Engine',
            detail: 'High-throughput LLM inference engine with PagedAttention for efficient GPU memory management and prefix caching support. Integrated with Dynamo as the execution backend. In this demo, runs Llama 3.1 8B on the RTX 5090.',
          },
          {
            name: 'GPU HBM',
            color: '#ED2738',
            role: 'Active KV Cache (Volatile)',
            detail: 'High-Bandwidth Memory on the GPU die. Holds actively-used KV tensors during inference. Extremely fast (~3.3 TB/s) but limited (24 GB on RTX 5090) and volatile — all cache is lost on restart, OOM eviction, or GPU reassignment. LMCache intercepts KV blocks before eviction and stages them to CPU, then persists to Infinia.',
          },
          {
            name: 'LMCache',
            color: '#76B900',
            role: 'KV Cache Bridge (CPU Staging + S3)',
            detail: 'Open-source KV cache offload layer that integrates with vLLM via LMCacheConnectorV1. Acts as a two-tier bridge: GPU HBM → CPU DRAM staging buffer (0.5 GB) → DDN Infinia S3. Chunks KV tensors into 32 MB bfloat16 objects, computes prefix hashes for lookup, and uploads asynchronously. In this demo, 69+ KV objects are already persisted in Infinia.',
          },
          {
            name: 'DDN Infinia',
            color: '#ED2738',
            role: 'Persistent AI Memory (KV Store)',
            detail: 'DDN\'s AI-native object storage optimized as a persistent KV cache backend. LMCache-connected with S3-compatible API, bfloat16 KV chunks (32 MB each). KV tensors survive GPU restarts, OOM events, and scaling operations. In this live demo, 69+ KV tensor objects are already stored in the ddn-kv-cache-01 bucket.',
          },
        ].map(({ name, color, role, detail }) => (
          <div key={name} className="rounded-lg p-4 space-y-2"
            style={{ background: 'var(--surface-secondary)', border: `1px solid ${color}30` }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs font-bold tracking-wide" style={{ color }}>{name}</span>
            </div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{role}</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{detail}</div>
          </div>
        ))}
      </div>

      {/* Data flow */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>KV CACHE DATA FLOW</div>
        <div className="space-y-2">
          {[
            { step: '1', label: 'Request arrives', detail: 'AIperf or user app sends prompt to Dynamo endpoint', color: '#1A81AF' },
            { step: '2', label: 'KV-aware routing', detail: 'Dynamo checks which vLLM worker holds the relevant prefix KV cache and routes accordingly', color: '#76B900' },
            { step: '3', label: 'Prefill or cache fetch', detail: 'If cache MISS → vLLM prefills (GPU compute). If HIT → LMCache loads KV tensors from CPU buffer or Infinia S3 in <10ms', color: '#64B5F6' },
            { step: '4', label: 'KV offload to Infinia', detail: 'After prefill, computed KV tensors are staged to CPU via LMCache (0.5 GB buffer), then asynchronously written to DDN Infinia S3 as 32 MB bfloat16 objects', color: '#76B900' },
            { step: '5', label: 'Token decode', detail: 'vLLM generates output tokens autoregressively using the (now cached) KV state', color: '#64B5F6' },
            { step: '6', label: 'Metrics captured', detail: 'AIperf measures TTFT, inter-token latency, and throughput — showing the cache speedup', color: '#1A81AF' },
          ].map(({ step, label, detail, color }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}>{step}</span>
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label} — </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 0 — Chat Observatory Architecture
// ═══════════════════════════════════════════════════════════════════

function ChatObservatoryArchitectureDetail() {
  const [activeDemo, setActiveDemo] = useState<'observatory' | 'kvreuse'>('observatory')

  return (
    <div className="space-y-5">

      {/* Tab selector */}
      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
        {([
          { id: 'observatory', label: 'Chat Observatory', color: '#6366f1' },
          { id: 'kvreuse',     label: 'KV Reuse Proof',  color: '#00C280' },
        ] as const).map(({ id, label, color }) => (
          <button key={id}
            onClick={() => setActiveDemo(id)}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            style={activeDemo === id
              ? { background: color, color: '#fff', boxShadow: `0 2px 8px ${color}40` }
              : { color: 'var(--text-muted)', background: 'transparent' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══ CHAT OBSERVATORY TAB ═══════════════════════════════════════════ */}
      {activeDemo === 'observatory' && (
        <div className="space-y-4">

          {/* What it is */}
          <div className="p-4 rounded-xl border" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.25)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#6366f1' }}>What Chat Observatory actually does</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              An <strong>application-layer semantic response cache.</strong> It stores the LLM's <em>text answer</em> as
              a JSON object in DDN Infinia. On a cache hit, the stored answer is returned directly —
              the GPU and LLM are bypassed entirely. This is <strong>not</strong> KV tensor caching;
              it is response-level caching at the application boundary.
            </p>
          </div>

          {/* MISS flow */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(237,39,56,0.35)' }}>
            <div className="px-4 py-2.5 text-xs font-bold" style={{ background: 'rgba(237,39,56,0.08)', color: '#ED2738' }}>
              CACHE MISS — First time this question is asked
            </div>
            <div className="p-4 space-y-2">
              {[
                { n: 1, label: 'User submits question', detail: 'Raw text sent to backend. e.g. "What is TTFT and why does it matter?"', color: '#6366f1' },
                { n: 2, label: 'Normalize → canonical form', detail: 'Acronyms expanded, filler words stripped, lowercased → "time to first token why matter". Ensures different phrasings of the same question map to the same key.', color: '#f59e0b' },
                { n: 3, label: 'SHA-256 hash → Infinia S3 GET', detail: 'Hash of canonical form = cache key. S3 GET on kvcache/{hash[:24]}.json → HTTP 404 Not Found. Lookup takes ~2ms.', color: '#8b5cf6' },
                { n: 4, label: '❌ MISS — full LLM call', detail: 'Entire conversation context sent to GPU. Prefill phase: GPU computes attention across all context tokens. Decode phase: response generated token-by-token. TTFT: 200–400ms.', color: '#ED2738' },
                { n: 5, label: 'S3 PUT — store response in Infinia', detail: 'Response text, token count, compute latency stored as JSON at kvcache/{hash}.json. This is what gets reused on future hits.', color: '#ED2738' },
                { n: 6, label: 'Response streamed to user', detail: 'User sees the LLM-generated answer. Full GPU cost incurred.', color: '#ED2738' },
              ].map(({ n, label, detail, color }) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 text-white" style={{ background: color }}>{n}</div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-[10px] font-bold" style={{ background: 'rgba(237,39,56,0.06)', color: '#ED2738' }}>
              Result: TTFT 200–400ms · Full GPU compute cost incurred
            </div>
          </div>

          {/* HIT flow */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(0,194,128,0.35)' }}>
            <div className="px-4 py-2.5 text-xs font-bold" style={{ background: 'rgba(0,194,128,0.08)', color: '#00C280' }}>
              CACHE HIT — Same or semantically equivalent question asked again
            </div>
            <div className="p-4 space-y-2">
              {[
                { n: 1, label: 'User submits same/similar question', detail: 'Could be exact same text, or a variant like "explain TTFT" or "what is time-to-first-token?" — normalization handles all variants.', color: '#6366f1' },
                { n: 2, label: 'Normalize → same canonical form', detail: 'Different phrasing → same canonical string → same SHA-256 hash. This is the key insight: semantic equivalence mapped to an identical cache key.', color: '#f59e0b' },
                { n: 3, label: 'SHA-256 hash → Infinia S3 GET', detail: 'Same hash as the first time. S3 GET on kvcache/{hash}.json → HTTP 200 OK. Object retrieved in 7–80ms.', color: '#8b5cf6' },
                { n: 4, label: '✅ HIT — GPU never called', detail: 'No LLM call is made. No prefill. No decode. Zero GPU cycles consumed. The stored JSON response is returned directly from Infinia.', color: '#00C280' },
                { n: 5, label: 'Stored response returned to user', detail: 'The cached text answer (generated on the first ask) is served. Response quality is identical — same canonical question, same answer.', color: '#00C280' },
              ].map(({ n, label, detail, color }) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 text-white" style={{ background: color }}>{n}</div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-[10px] font-bold" style={{ background: 'rgba(0,194,128,0.06)', color: '#00C280' }}>
              Result: TTFT 7–80ms · GPU never called · ~94% cost reduction
            </div>
          </div>

          {/* What Infinia actually stores */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-card)' }}>
              <Database className="w-3.5 h-3.5" style={{ color: '#00C280' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>What Infinia Actually Stores</span>
              <span className="ml-auto text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(0,194,128,0.1)', color: '#00C280' }}>kvcache/{'<hash>'}.json</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="font-mono text-[10px] rounded-lg p-3 leading-relaxed" style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }}>
                {`{`}<br />
                &nbsp;&nbsp;<span style={{ color: '#f59e0b' }}>"query"</span>{`: `}<span style={{ color: '#00C280' }}>"what is kv cache"</span>{`,`}<br />
                &nbsp;&nbsp;<span style={{ color: '#f59e0b' }}>"response"</span>{`: `}<span style={{ color: '#00C280' }}>"KV cache stands for Key-Value cache..."</span>{`,`}<br />
                &nbsp;&nbsp;<span style={{ color: '#f59e0b' }}>"full_tokens"</span>{`: `}<span style={{ color: '#64B5F6' }}>293</span>{`,`}<br />
                &nbsp;&nbsp;<span style={{ color: '#f59e0b' }}>"compute_ms"</span>{`: `}<span style={{ color: '#64B5F6' }}>2949.1</span>{`,`}<br />
                &nbsp;&nbsp;<span style={{ color: '#f59e0b' }}>"_cached_at"</span>{`: `}<span style={{ color: '#00C280' }}>"2025-08-20T03:32:09"</span><br />
                {`}`}
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Important:</strong> Infinia stores the <em>text response</em> — not KV attention tensors or GPU memory state.
                The object is a plain JSON file (~3 KB). Real S3 API calls, real network round-trips, real measured latency.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ═══ KV REUSE PROOF TAB ═════════════════════════════════════════════ */}
      {activeDemo === 'kvreuse' && (
        <div className="space-y-4">

          {/* What it is */}
          <div className="p-4 rounded-xl border" style={{ background: 'rgba(0,194,128,0.05)', borderColor: 'rgba(0,194,128,0.25)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#00C280' }}>What KV Reuse Proof actually does</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A <strong>GPU-layer KV tensor prefix cache.</strong> A 6,657-token enterprise document is loaded once —
              the GPU computes Key+Value attention matrices for all 6,657 tokens and stores them in GPU HBM (VRAM).
              Every subsequent question about that document skips the expensive prefill compute entirely.
              In production (Dynamo + LMCache), these tensors are offloaded to Infinia so they persist across GPU
              restarts and are shared across your entire GPU fleet.
            </p>
          </div>

          {/* Cold run */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(237,39,56,0.35)' }}>
            <div className="px-4 py-2.5 text-xs font-bold flex items-center gap-2" style={{ background: 'rgba(237,39,56,0.08)', color: '#ED2738' }}>
              <span>COLD RUN</span>
              <span className="text-[9px] font-mono ml-auto">GPU HBM ONLY — first inference</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                { n: 1, label: '6,657-token document loaded as system prompt', detail: 'A full enterprise legal contract (Master Service Agreement) is set as the system prompt. Every query about this document will include all 6,657 tokens.', color: '#6366f1' },
                { n: 2, label: 'GPU runs prefill on ALL 6,657 tokens', detail: 'The transformer computes Key (K) and Value (V) attention matrices for every single document token across all 32 transformer layers. This is extremely GPU-intensive — there is no shortcut. TTFT: 3,000–5,000ms.', color: '#ED2738' },
                { n: 3, label: 'KV tensors stored in GPU HBM as prefix cache block', detail: 'vLLM\'s PagedAttention stores the computed K+V matrices as a prefix cache block in GPU HBM (VRAM). Size: ~832 MB across 32 layers × 8 KV heads × 128 head_dim × fp16. This block is keyed by a hash of the prefix token sequence.', color: '#ED2738' },
                { n: 4, label: 'User question (15 tokens) decoded normally', detail: 'After the expensive prefill, the user\'s question tokens are processed and the answer is generated token-by-token (decode phase). TTFT reflects the full 6,657-token prefill cost.', color: '#ED2738' },
              ].map(({ n, label, detail, color }) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 text-white" style={{ background: color }}>{n}</div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-[10px] font-bold" style={{ background: 'rgba(237,39,56,0.06)', color: '#ED2738' }}>
              Result: TTFT 3,000–5,000ms · 832 MB of KV tensors written to GPU HBM
            </div>
          </div>

          {/* Warm run */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(0,194,128,0.35)' }}>
            <div className="px-4 py-2.5 text-xs font-bold flex items-center gap-2" style={{ background: 'rgba(0,194,128,0.08)', color: '#00C280' }}>
              <span>WARM RUN</span>
              <span className="text-[9px] font-mono ml-auto">KV PREFIX CACHE HIT — same document, new question</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                { n: 1, label: 'New user question, same document prefix', detail: 'Any question about the same document. The 6,657-token system prompt prefix is identical — that\'s all vLLM needs to check.', color: '#6366f1' },
                { n: 2, label: 'vLLM detects prefix cache hit in HBM', detail: 'vLLM hashes the prefix token sequence and finds a matching block in GPU HBM. The 832 MB of pre-computed KV tensors are already there — no network call, no recompute.', color: '#00C280' },
                { n: 3, label: 'Prefill SKIPPED — 6,657 tokens not recomputed', detail: 'The GPU skips the entire prefill phase for the document tokens. It loads the cached KV block and jumps straight to processing the new question tokens.', color: '#00C280' },
                { n: 4, label: 'Only ~15 new question tokens processed', detail: 'GPU compute for this request = prefill of just the user\'s question (~15 tokens) + decode. From 6,657 tokens of compute down to 15. TTFT drops to ~50ms.', color: '#00C280' },
              ].map(({ n, label, detail, color }) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 text-white" style={{ background: color }}>{n}</div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 text-[10px] font-bold" style={{ background: 'rgba(0,194,128,0.06)', color: '#00C280' }}>
              Result: TTFT ~50ms · 99.8% of prefill compute eliminated · 50–80× speedup
            </div>
          </div>

          {/* What GPU HBM stores */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-card)' }}>
              <MemoryStick className="w-3.5 h-3.5" style={{ color: '#ED2738' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>What GPU HBM Stores (KV Tensor Math)</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Prefix tokens', val: '6,657 token IDs', color: '#6366f1' },
                  { label: 'Transformer layers', val: '32 layers', color: '#f59e0b' },
                  { label: 'KV heads (GQA)', val: '8 heads × 128 dim', color: '#8b5cf6' },
                  { label: 'Precision', val: 'fp16 (2 bytes/value)', color: '#64B5F6' },
                  { label: 'Bytes per token', val: '2 × 8 × 128 × 2 × 32 = 131,072', color: '#ED2738' },
                  { label: 'Total KV size', val: '~832 MB in GPU HBM', color: '#00C280' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="p-2.5 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-[10px] font-mono font-semibold" style={{ color }}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg border" style={{ background: 'rgba(118,185,0,0.05)', borderColor: 'rgba(118,185,0,0.2)' }}>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#76B900' }}>Production with NIXL + Infinia:</strong> These 832 MB of KV tensors would be
                  written to DDN Infinia via NIXL after each prefill. On subsequent requests — even after GPU restart
                  or across different GPUs — NIXL fetches them back in &lt;10ms instead of recomputing.
                  One Infinia cluster serves your entire GPU fleet.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ═══ COMPARISON TABLE (always visible) ═════════════════════════════ */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-card)' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Side-by-Side: Two Different Caching Strategies</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-secondary)' }}>
                <th className="px-4 py-2 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Dimension</th>
                <th className="px-4 py-2 text-left font-bold" style={{ color: '#6366f1' }}>Chat Observatory</th>
                <th className="px-4 py-2 text-left font-bold" style={{ color: '#00C280' }}>KV Reuse Proof</th>
              </tr>
            </thead>
            <tbody>
              {[
                { dim: 'What is cached',      obs: 'LLM text response (JSON)',       kv: 'KV attention tensors (binary GPU state)' },
                { dim: 'Cache layer',         obs: 'Application layer',              kv: 'Inference engine layer (vLLM)' },
                { dim: 'Where stored',        obs: 'DDN Infinia (S3 object store)',  kv: 'GPU HBM → Infinia via NIXL (production)' },
                { dim: 'Object size',         obs: '~3 KB (text JSON)',              kv: '~832 MB (tensor blocks)' },
                { dim: 'Cache key',           obs: 'SHA-256 of normalized question', kv: 'Hash of prefix token sequence' },
                { dim: 'On cache hit',        obs: 'GPU never called at all',        kv: 'Prefill skipped, decode still runs' },
                { dim: 'GPU compute saved',   obs: '100% (LLM bypassed)',            kv: '99.8% of prefill tokens' },
                { dim: 'Infinia live today',  obs: '✅ Real S3 calls',               kv: '⚠️ GPU HBM in demo; Infinia in production' },
              ].map(({ dim, obs, kv }, i) => (
                <tr key={dim} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-secondary)' }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>{dim}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{obs}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{kv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}



const CONCEPTS = [
  {
    id: 'dynamo',
    icon: <Zap className="w-5 h-5" />,
    label: 'Dynamo + LMCache Architecture',
    subtitle: 'Stack Overview',
    tag: 'Architecture',
    tagColor: '#76B900',
    summary: 'Full stack diagram — AIperf, Dynamo, vLLM, LMCache, GPU HBM, and DDN Infinia with data flow',
    ready: true,
  },
  {
    id: 'observatory',
    icon: <Layers className="w-5 h-5" />,
    label: 'Chat Observatory Architecture',
    subtitle: 'How It Works',
    tag: 'System Design',
    tagColor: '#6366f1',
    summary: 'Side-by-side chatbot internals — request flow, cache key generation, S3 operations, and metrics',
    ready: true,
  },
  {
    id: 'mechanics',
    icon: <Zap className="w-5 h-5" />,
    label: 'KV Cache Mechanics',
    subtitle: 'Architecture',
    tag: 'Architecture',
    tagColor: 'var(--ddn-red)',
    summary: 'What K/V matrices are, what gets cached, and the 4-stage request lifecycle',
    ready: true,
  },
  {
    id: 'multiturn',
    icon: <TrendingDown className="w-5 h-5" />,
    label: 'Multi-Turn Walkthrough',
    subtitle: 'How It Works',
    tag: 'How It Works',
    tagColor: '#00C280',
    summary: 'Turn-by-turn breakdown — MISS, HIT, and compound savings over time',
    ready: true,
  },
  {
    id: 'session',
    icon: <Server className="w-5 h-5" />,
    label: 'Session Resume',
    subtitle: 'Enterprise Scenario',
    tag: 'Enterprise',
    tagColor: '#1A81AF',
    summary: 'GPU memory eviction, Infinia persistence, and the 50ms resume advantage',
    ready: true,
  },
  {
    id: 'storage',
    icon: <HardDrive className="w-5 h-5" />,
    label: 'GPU vs Infinia Storage',
    subtitle: 'Infrastructure',
    tag: 'Infrastructure',
    tagColor: '#76B900',
    summary: 'Speed, capacity, persistence, and cost — side-by-side comparison',
    ready: true,
  },
  {
    id: 'icp',
    icon: <Users className="w-5 h-5" />,
    label: 'Who Benefits (ICP)',
    subtitle: 'Business Value',
    tag: 'Business',
    tagColor: '#f59e0b',
    summary: 'Recommended demo routes and talking points by audience persona',
    ready: true,
  },
]

function renderSection(id: string) {
  switch (id) {
    case 'dynamo':    return <DynamoNIXLArchitectureDetail />
    case 'observatory': return <ChatObservatoryArchitectureDetail />
    case 'mechanics': return <KVMechanicsDetail />
    case 'multiturn': return <MultiTurnDetail />
    case 'session':   return <SessionResumeDetail />
    case 'storage':   return <StorageComparisonDetail />
    case 'icp':       return <ICPDetail />
    default:          return null
  }
}

export default function About() {
  const [active, setActive] = useState('mechanics')
  const concept = CONCEPTS.find(c => c.id === active)!

  return (
    <div className="flex gap-0 -m-6 md:-m-8" style={{ minHeight: '600px' }}>

      {/* ── Left navigator ─────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 border-r py-4 flex flex-col gap-1"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-secondary)' }}>

        <div className="px-4 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: 'var(--ddn-red)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Details
            </span>
          </div>
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Architecture reference &amp; talking points
          </p>
        </div>

        {CONCEPTS.map(c => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors"
            style={{
              background: active === c.id ? 'var(--surface-card)' : 'transparent',
              borderLeft: active === c.id ? `3px solid ${c.tagColor}` : '3px solid transparent',
            }}>
            <span className="shrink-0 mt-0.5" style={{ color: active === c.id ? c.tagColor : 'var(--text-muted)' }}>
              {c.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight"
                style={{ color: active === c.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {c.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.subtitle}</p>
            </div>
            {active === c.id && (
              <CheckCircle className="w-3 h-3 shrink-0 ml-auto mt-1" style={{ color: c.tagColor }} />
            )}
          </button>
        ))}

        {/* Port reference at bottom */}
        <div className="mt-auto px-4 pt-4">
          <div className="p-2.5 rounded-lg border-dashed border text-[10px] leading-relaxed space-y-1"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
            <div className="font-semibold" style={{ color: 'var(--ddn-red)' }}>KV Cache Observatory</div>
            <div>FE: :5176 · BE: :8002</div>
            <div>Infinia bucket: ddn-kv-cache-01</div>
          </div>
        </div>
      </div>

      {/* ── Right content area ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="p-6 md:p-8">

            {/* Section header */}
            <div className="flex items-start gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${concept.tagColor}18`, color: concept.tagColor }}>
                {concept.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {concept.label}
                  </h2>
                  <Tag color={concept.tagColor}>{concept.tag}</Tag>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{concept.summary}</p>
              </div>
            </div>

            {renderSection(active)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
