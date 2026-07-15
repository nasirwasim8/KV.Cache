import { useState } from 'react'
import { Database, Zap, ChevronRight, ChevronDown, Users, MemoryStick, Server, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Step-through multi-turn KV cache walkthrough ────────────────────────────

const STEPS = [
  {
    id: 1,
    phase: 'Turn 1 — No Cache Yet',
    emoji: '🔴',
    color: '#ED2738',
    audience: 'both',
    title: 'Full Prefill: Every token processed from scratch',
    what: [
      { token: 'System prompt', count: '~700 tokens', highlight: true },
      { token: 'User question', count: '"What is Infinia?" → 5 tokens', highlight: true },
    ],
    gpu: 'GPU processes ALL 705 tokens → generates K,V matrices for each → produces answer',
    kv_stored: 'KV state (K+V matrices for 705 tokens) → stored in DDN Infinia (S3 PUT)',
    cost_note: 'Paid for: 705 input tokens × rate + output tokens × rate',
    analogy: '📚 Like reading the entire textbook before answering one question.',
  },
  {
    id: 2,
    phase: 'Turn 2 — Cache Hit!',
    emoji: '🟢',
    color: '#00C280',
    audience: 'both',
    title: 'Only the new question is processed — prefix is FREE',
    what: [
      { token: 'System prompt', count: '~700 tokens', highlight: false, cached: true },
      { token: 'User question', count: '"Explain the pricing" → 4 tokens', highlight: true },
    ],
    gpu: 'Infinia returns cached K,V in ~10ms → GPU skips 700-token prefill → only processes 4 new tokens',
    kv_stored: 'New K,V appended (4 tokens) → Infinia updated with full session state',
    cost_note: 'Paid for: 4 new input tokens only. 700 cached tokens = FREE (self-hosted) or 90% discount (cloud)',
    analogy: '📖 Like using a bookmark — you only read the new chapter, not the whole book again.',
  },
  {
    id: 3,
    phase: 'Turn N — Savings Compound',
    emoji: '💰',
    color: '#1A81AF',
    audience: 'both',
    title: 'Each subsequent turn is dramatically cheaper',
    what: [
      { token: 'Accumulated history', count: 'grows with each turn', highlight: false, cached: true },
      { token: 'New question only', count: '~5-20 tokens', highlight: true },
    ],
    gpu: 'GPU only prefills new tokens. Everything else: 10ms Infinia lookup. TTFT stays consistently fast.',
    kv_stored: 'Infinia holds the entire growing conversation state — persistent, shareable across GPU nodes',
    cost_note: 'By turn 10: 98%+ of input tokens are cached. Cost per turn approaches near-zero for input.',
    analogy: '💡 Like a photographic memory — the more context accumulated, the more you save.',
  },
]

function StepCard({ step, active, onClick }: { step: typeof STEPS[0]; active: boolean; onClick: () => void }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      className="cursor-pointer rounded-xl border-2 transition-all overflow-hidden"
      style={{
        borderColor: active ? step.color : 'var(--border-subtle)',
        background: active ? `${step.color}08` : 'var(--surface-card)',
      }}
    >
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl">{step.emoji}</span>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: step.color }}>{step.phase}</div>
          <div className="text-sm font-semibold text-neutral-800 mt-0.5">{step.title}</div>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform" style={{ color: step.color, transform: active ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-4 border-t" style={{ borderColor: `${step.color}20` }}>
              {/* Token breakdown */}
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Tokens in this request:</div>
                <div className="space-y-2">
                  {step.what.map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="px-3 py-1.5 rounded-lg text-xs font-mono flex-1"
                        style={w.cached
                          ? { background: 'rgba(0,194,128,0.08)', color: '#00C280', border: '1px solid rgba(0,194,128,0.2)' }
                          : w.highlight
                          ? { background: `${step.color}12`, color: step.color, border: `1px solid ${step.color}30` }
                          : { background: 'var(--surface-secondary)', color: 'var(--text-muted)' }
                        }
                      >
                        {w.token}
                        {w.cached && <span className="ml-2 font-bold">← CACHED ✓ (Infinia)</span>}
                      </div>
                      <div className="text-xs text-neutral-500 w-40 text-right">{w.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPU process */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.2)' }}>
                <div className="text-xs font-bold text-neutral-600 mb-1">🖥️ GPU does:</div>
                <div className="text-xs text-neutral-700">{step.gpu}</div>
              </div>

              {/* Infinia action */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(237,39,56,0.06)', border: '1px solid rgba(237,39,56,0.2)' }}>
                <div className="text-xs font-bold text-neutral-600 mb-1">🗄️ DDN Infinia:</div>
                <div className="text-xs text-neutral-700">{step.kv_stored}</div>
              </div>

              {/* Cost */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(26,129,175,0.06)', border: '1px solid rgba(26,129,175,0.2)' }}>
                <div className="text-xs font-bold text-neutral-600 mb-1">💲 Billing:</div>
                <div className="text-xs text-neutral-700">{step.cost_note}</div>
              </div>

              {/* Analogy */}
              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
                <div className="text-xs text-neutral-600 italic">{step.analogy}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── KV Cache mechanics diagram ───────────────────────────────────────────────

function KVMechanicsCard() {
  return (
    <div className="card p-6 space-y-5">
      <h3 className="font-bold text-neutral-900 text-base">🔬 What Exactly Gets Cached?</h3>

      {/* The answer */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(26,129,175,0.06)', border: '2px solid rgba(26,129,175,0.2)' }}>
        <div className="font-semibold text-sm text-neutral-800 mb-2">The short answer:</div>
        <div className="text-sm text-neutral-700">
          KV Cache stores the <strong>Key (K)</strong> and <strong>Value (V)</strong> attention matrices computed during the
          {' '}<strong>input (prefill) phase</strong> only. Output tokens are generated one-at-a-time and are <em>not</em> the
          expensive part — they're sequential by nature. What we save is the expensive <strong>parallel prefill</strong> computation.
        </div>
      </div>

      {/* Two-phase visual */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">The 2 Phases of Every LLM Request:</div>
        <div className="grid grid-cols-2 gap-3">
          {/* Prefill */}
          <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: '#ED2738' }}>
            <div className="px-4 py-2 text-xs font-bold text-white" style={{ background: '#ED2738' }}>
              Phase 1: PREFILL (input processing)
            </div>
            <div className="p-4 space-y-2 text-xs text-neutral-700">
              <div>• ALL input tokens processed <strong>simultaneously</strong> (parallelizable)</div>
              <div>• Each token generates its own <strong>K matrix</strong> and <strong>V matrix</strong></div>
              <div>• For 700 tokens → 700 K/V pairs computed</div>
              <div>• This is <strong>GPU-intensive</strong> and expensive at scale</div>
              <div className="pt-2 font-semibold" style={{ color: '#ED2738' }}>← This is what KV Cache ELIMINATES</div>
            </div>
          </div>

          {/* Decode */}
          <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: '#76B900' }}>
            <div className="px-4 py-2 text-xs font-bold text-white" style={{ background: '#76B900' }}>
              Phase 2: DECODE (output generation)
            </div>
            <div className="p-4 space-y-2 text-xs text-neutral-700">
              <div>• Output tokens generated <strong>one at a time</strong> (sequential)</div>
              <div>• Each new token attends to ALL previous K/V pairs</div>
              <div>• Cannot be parallelized — inherently autoregressive</div>
              <div>• Speed limited by GPU memory bandwidth</div>
              <div className="pt-2 font-semibold" style={{ color: '#76B900' }}>← Same cost with or without KV Cache</div>
            </div>
          </div>
        </div>
      </div>

      {/* What's in K and V */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Inside the KV Matrices (simplified):</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Q (Query)', color: '#807778', desc: 'NOT cached', note: 'Computed fresh for each new token', emoji: '❓' },
            { label: 'K (Key)', color: '#00C280', desc: 'CACHED in Infinia', note: '"What information does this token contain?"', emoji: '🔑' },
            { label: 'V (Value)', color: '#00C280', desc: 'CACHED in Infinia', note: '"The actual content/meaning of this token"', emoji: '📦' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-xl border text-center"
              style={{ borderColor: `${m.color}40`, background: `${m.color}08` }}>
              <div className="text-xl mb-1">{m.emoji}</div>
              <div className="text-sm font-bold" style={{ color: m.color }}>{m.label}</div>
              <div className="text-xs font-semibold mt-1" style={{ color: m.color }}>{m.desc}</div>
              <div className="text-xs text-neutral-500 mt-1">{m.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── GPU Memory vs Infinia comparison ─────────────────────────────────────────

function StorageComparisonCard() {
  const rows = [
    { metric: 'Capacity', gpu: '~2-8GB (shares VRAM with model weights)', infinia: 'Petabytes — unlimited sessions', winner: 'infinia' },
    { metric: 'Speed (read)', gpu: '< 1ms (on-chip)', infinia: '10–80ms (network S3 GET)', winner: 'gpu' },
    { metric: 'Persistence', gpu: '❌ Lost on restart / GPU OOM', infinia: '✅ Persistent forever', winner: 'infinia' },
    { metric: 'Scale', gpu: 'Single GPU only', infinia: 'Shared across ALL GPU nodes in cluster', winner: 'infinia' },
    { metric: 'Cost', gpu: 'Competes with model weights for VRAM', infinia: '$0.023/GB/month (object store pricing)', winner: 'infinia' },
    { metric: 'Concurrent sessions', gpu: 'Dozens (VRAM-limited)', infinia: 'Millions', winner: 'infinia' },
    { metric: 'Best for', gpu: 'Single active session, real-time streaming', infinia: 'Enterprise scale, multi-user, multi-GPU', winner: 'infinia' },
  ]

  return (
    <div className="card p-6">
      <h3 className="font-bold text-neutral-900 text-base mb-4">🆚 GPU Memory Cache vs DDN Infinia Object Store</h3>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--surface-secondary)' }}>
              <th className="px-4 py-3 text-left font-semibold text-neutral-600">Feature</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: '#76B900' }}>GPU VRAM Cache</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: '#ED2738' }}>DDN Infinia (Object Store)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.metric} style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                <td className="px-4 py-3 font-semibold text-neutral-700">{row.metric}</td>
                <td className="px-4 py-3 text-center text-neutral-600" style={{ background: row.winner === 'gpu' ? 'rgba(118,185,0,0.06)' : undefined }}>
                  {row.winner === 'gpu' && <span className="text-xs mr-1">⭐</span>}{row.gpu}
                </td>
                <td className="px-4 py-3 text-center font-medium" style={{ color: row.winner === 'infinia' ? '#ED2738' : 'var(--text-secondary)', background: row.winner === 'infinia' ? 'rgba(237,39,56,0.04)' : undefined }}>
                  {row.winner === 'infinia' && <span className="text-xs mr-1">⭐</span>}{row.infinia}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(237,39,56,0.06)', border: '1px solid rgba(237,39,56,0.2)' }}>
        <div className="text-sm font-semibold text-neutral-800">
          🏆 Bottom line for enterprise AI:
        </div>
        <div className="text-xs text-neutral-600 mt-1">
          GPU VRAM cache is fast but <strong>fragile and finite</strong> — it evicts under memory pressure and dies on restarts.
          DDN Infinia is <strong>10–80ms slower per lookup</strong>, but provides <strong>unlimited, persistent, shared</strong> KV
          storage across your entire GPU cluster. At scale (50K+ requests/day), the 70ms read overhead is negligible compared to
          the 4,000ms+ prefill cost it eliminates.
        </div>
      </div>
    </div>
  )
}

// ─── ICP section ──────────────────────────────────────────────────────────────

const ICPS = [
  { role: 'MLOps / Infra Engineers', concern: 'GPU utilization & cost per request', benefit: 'Direct proof of fewer GPU cycles per turn', icon: '⚙️' },
  { role: 'CTOs / VP Engineering', concern: 'Infrastructure budget & scale', benefit: 'Monthly & annual $ savings at real traffic volume', icon: '💼' },
  { role: 'AI Product Managers', concern: 'Latency & user experience', benefit: 'Sub-100ms TTFT on repeated queries = better UX', icon: '🚀' },
  { role: 'Finance / Procurement', concern: 'Cloud vs on-prem ROI', benefit: 'Hard numbers: cost per call with/without cache', icon: '📊' },
  { role: 'AI Platform Engineers', concern: 'vLLM prefix caching at scale', benefit: 'Infinia replaces ephemeral GPU memory with persistent object store', icon: '🔬' },
]

// ─── Main export ──────────────────────────────────────────────────────────────

export default function About() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div className="space-y-8">
      <div className="section-header">
        <h2 className="section-title">Architecture & How KV Cache Works</h2>
        <p className="section-description">
          A business-friendly explainer of what KV Cache is, what gets stored, and why DDN Infinia changes the economics.
        </p>
      </div>

      {/* ── What gets cached ── */}
      <KVMechanicsCard />

      {/* ── Multi-turn walkthrough ── */}
      <div className="card p-6">
        <h3 className="font-bold text-neutral-900 text-base mb-2">🔄 Multi-Turn Chat: What Happens at Each Turn</h3>
        <p className="text-xs text-neutral-500 mb-4">
          Click each step to expand the full breakdown — what the GPU does, what Infinia stores, and what you pay.
        </p>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              active={activeStep === i}
              onClick={() => setActiveStep(activeStep === i ? -1 : i)}
            />
          ))}
        </div>

        {/* Savings trajectory */}
        <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
          <div className="text-xs font-bold text-neutral-600 mb-1">💹 Cost per turn over a conversation (illustrative):</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#ED2738' }} />
              <span className="text-xs text-neutral-500">Full cost (MISS)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#00C280' }} />
              <span className="text-xs text-neutral-500">With Infinia Cache</span>
            </div>
          </div>
          <div className="flex items-end gap-2" style={{ height: '72px' }}>
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
          {/* Turn labels below bars */}
          <div className="flex items-center gap-2 mt-1">
            {['T1','T2','T3','T4','T5','T10','T50'].map(t => (
              <div key={t} className="flex-1 text-center font-bold text-neutral-500" style={{ fontSize: '10px' }}>{t}</div>
            ))}
          </div>
          <div className="mt-2 text-xs text-neutral-400 text-center">
            85% saved at T2 · 92% at T3 · ~99% at T50
          </div>
        </div>

        {/* ── Core Demo Point ── */}
        <div className="mt-4 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(0,194,128,0.25)' }}>
          <div className="px-4 py-2.5 font-bold text-sm" style={{ background: 'rgba(0,194,128,0.08)', color: '#00C280' }}>
            ⚡ The Core Demo Point — Token Growth Per Turn
          </div>
          <div className="p-4">
            <p className="text-xs text-neutral-500 mb-3">
              The <strong>left panel (No Cache)</strong> carries all prior conversation history on every turn — its token count grows like a leaking bucket.
              The <strong>right panel (Infinia)</strong> only ever sends the new question — a flat line regardless of conversation length.
            </p>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--surface-secondary)' }}>
                    <th className="text-left px-3 py-2 font-semibold text-neutral-600">Turn</th>
                    <th className="text-left px-3 py-2 font-semibold text-neutral-600">Question Asked</th>
                    <th className="px-3 py-2 font-semibold text-center" style={{ color: '#ED2738' }}>❌ Left — Tokens Sent</th>
                    <th className="px-3 py-2 font-semibold text-center" style={{ color: '#00C280' }}>✅ Right — Tokens Sent</th>
                    <th className="text-center px-3 py-2 font-semibold text-neutral-600">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { turn: 'Turn 1', q: '"What is DDN Infinia?"',        left: '5 tokens',          right: '5 tokens',    result: 'MISS → stored in Infinia', hit: false },
                    { turn: 'Turn 2', q: '"Tell me more about it"',        left: '5 + reply1 + 10',   right: '10 tokens',   result: 'New Q → MISS → stored',    hit: false },
                    { turn: 'Turn 3', q: '"What is DDN Infinia?" (again)', left: '5+reply1+10+reply2+5', right: '⚡ 0ms HIT', result: 'Instant from Infinia',     hit: true  },
                    { turn: 'Turn N', q: 'Any previously asked question',  left: 'Growing unbounded', right: '⚡ 0ms HIT', result: 'Always free after 1st ask', hit: true  },
                  ].map((row, i) => (
                    <tr key={i} style={{ background: row.hit ? 'rgba(0,194,128,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--surface-secondary)' }}>
                      <td className="px-3 py-2 font-semibold text-neutral-700">{row.turn}</td>
                      <td className="px-3 py-2 text-neutral-600 italic">{row.q}</td>
                      <td className="px-3 py-2 text-center font-mono" style={{ color: '#ED2738' }}>{row.left}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold" style={{ color: row.hit ? '#00C280' : 'var(--text-secondary)' }}>{row.right}</td>
                      <td className="px-3 py-2 text-center" style={{ color: row.hit ? '#00C280' : '#1A81AF' }}>{row.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 rounded-lg text-xs font-medium" style={{ background: 'rgba(237,39,56,0.05)', border: '1px solid rgba(237,39,56,0.15)', color: 'var(--text-secondary)' }}>
              💡 <strong style={{ color: '#ED2738' }}>The left panel is a leaking bucket</strong> — every turn adds more tokens, more GPU time, more cost.
              {' '}<strong style={{ color: '#00C280' }}>The right panel with Infinia is a flat line</strong> — it only ever pays for the new words you type. Once cached, any question costs near-zero to answer — forever.
            </div>
          </div>
        </div>
      </div>

      {/* ── GPU vs Infinia table ── */}
      <StorageComparisonCard />

      {/* ── ICP ── */}
      <div className="card p-6">
        <h3 className="font-bold text-neutral-900 text-base mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-ddn-red" /> Who Benefits Most (ICP)
        </h3>
        <div className="space-y-3">
          {ICPS.map(icp => (
            <div key={icp.role} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
              <span className="text-2xl">{icp.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-neutral-900">{icp.role}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Cares about: {icp.concern}</div>
              </div>
              <div className="text-xs text-right font-medium" style={{ color: 'var(--status-success)', maxWidth: '220px' }}>{icp.benefit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Port isolation ── */}
      <div className="card p-5" style={{ borderLeft: '3px solid #FF7600' }}>
        <h4 className="font-semibold text-sm mb-2" style={{ color: '#FF7600' }}>⚠️ Demo Port Isolation — Other Apps Untouched</h4>
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
