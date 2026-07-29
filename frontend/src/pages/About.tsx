import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronRight, CheckCircle, Zap, Database, Server,
  MemoryStick, Users, Layers, ArrowRight, AlertTriangle, HardDrive,
  TrendingDown, Shield
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

      {/* Analogy */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(26,129,175,0.06)', border: '1px solid rgba(26,129,175,0.2)' }}>
        <div className="text-xs font-bold mb-1" style={{ color: '#1A81AF' }}>💡 Plain-English Analogy</div>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Think of the GPU like a <strong>busy doctor's short-term memory</strong>. After seeing 50 patients, the
          doctor can't recall patient #1's earlier visit. Without Infinia, that patient re-tells their full history
          from scratch. <strong>With Infinia, the notes are stored externally</strong> — retrieved in seconds so the
          conversation picks up exactly where it left off.
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

const CONCEPTS = [
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
