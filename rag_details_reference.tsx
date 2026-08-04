import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Database, Cpu, Layers, ChevronRight, Lock, CheckCircle,
  Code2, MessageSquare, BookOpen, ArrowRight, Zap, Filter,
  Server, HardDrive, AlertTriangle, Info, Upload
} from 'lucide-react'

// ── Concept registry — add new entries here to extend the glossary ─────────

interface Concept {
  id: string
  icon: React.ReactNode
  label: string
  tag: string
  tagColor: string
  summary: string
  ready: boolean
}

const CONCEPTS: Concept[] = [
  {
    id: 'rbac',
    icon: <Shield className="w-5 h-5" />,
    label: 'RBAC Access Control',
    tag: 'Security',
    tagColor: 'var(--ddn-red)',
    summary: 'Metadata-driven query-time filtering — same bucket, different answers',
    ready: true,
  },
  {
    id: 'rag',
    icon: <Layers className="w-5 h-5" />,
    label: 'RAG Pipeline',
    tag: 'Architecture',
    tagColor: 'var(--status-info)',
    summary: 'How a question becomes a grounded LLM answer via Infinia retrieval',
    ready: true,
  },
  {
    id: 'embedding',
    icon: <Cpu className="w-5 h-5" />,
    label: 'Embedding & Indexing',
    tag: 'ML',
    tagColor: 'var(--status-success)',
    summary: 'How text chunks become 384-dim vectors stored on Infinia S3',
    ready: false,
  },
  {
    id: 'infinia',
    icon: <HardDrive className="w-5 h-5" />,
    label: 'Infinia Storage Layer',
    tag: 'Infrastructure',
    tagColor: 'var(--text-muted)',
    summary: 'How DDN Infinia serves as the unified vector + object store',
    ready: false,
  },
]

// ── Shared sub-components ──────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
      style={{ color: 'var(--text-primary)' }}>
      {children}
    </h3>
  )
}

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

function TalkingPoint({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border"
      style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
      </div>
    </div>
  )
}

function CodeSnip({ children }: { children: string }) {
  return (
    <pre className="text-[11px] leading-relaxed overflow-x-auto p-4 rounded-xl font-mono"
      style={{ background: 'var(--surface-code, #0d1117)', color: '#c9d1d9', border: '1px solid var(--border-subtle)' }}>
      <code>{children}</code>
    </pre>
  )
}

function ComingSoon({ concept }: { concept: Concept }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
        {concept.icon}
      </div>
      <div>
        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{concept.label}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Technical explainer coming soon — check back after the next session.
        </p>
      </div>
    </div>
  )
}

// ── CONCEPT 1: RBAC ────────────────────────────────────────────────────────

function RBACDetail() {
  const [activeStage, setActiveStage] = useState<number | null>(null)

  const PIPELINE = [
    {
      n: 1,
      label: 'Embed Query',
      icon: <Zap className="w-4 h-4" />,
      color: 'var(--status-info)',
      detail: "The user's question is converted to a 384-dimensional vector using sentence-transformers (all-MiniLM-L6-v2), running on GPU via CUDA.",
      code: 'embedding = model.encode(query)  # → float32[384]',
    },
    {
      n: 2,
      label: 'FAISS Search',
      icon: <Database className="w-4 h-4" />,
      color: 'var(--status-info)',
      detail: "FAISS (IndexFlatL2) finds the top-K nearest neighbours by L2 distance. No RBAC yet — this is pure semantic similarity across ALL chunks.",
      code: 'distances, indices = index.search(embedding, k=8)\n# Returns 8 closest chunks — confidential or not',
    },
    {
      n: 3,
      label: 'RBAC Metadata Filter',
      icon: <Filter className="w-4 h-4" />,
      color: 'var(--ddn-red)',
      detail: "For each FAISS result, the classification tag stored on the Infinia S3 chunk object is read from the in-memory chunk_metadata dict. Standard-role hits on confidential chunks are silently dropped. This is the ONLY gate.",
      code: 'for dist, idx in zip(distances[0], indices[0]):\n    cls = chunk_metadata[idx]["metadata"]["classification"]\n    if user_role == "standard" and cls == "confidential":\n        continue  # ← dropped — never fetched from S3\n    chunk_ids.append(chunk_metadata[idx]["chunk_id"])\n\nif not chunk_ids:          # ALL results filtered?\n    return ACCESS_DENIED   # ← LLM never called',
    },
    {
      n: 4,
      label: 'Fetch from Infinia S3',
      icon: <HardDrive className="w-4 h-4" />,
      color: 'var(--status-success)',
      detail: "Only the ALLOWED chunk IDs are fetched from Infinia S3. DDN vs AWS TTFB is measured here. For standard users whose query matched only confidential chunks, execution never reaches this stage.",
      code: '# Only cleared chunk_ids reach here\nfor chunk_id in chunk_ids:\n    data = handler.download_bytes(f"chunks/{chunk_id}.json")',
    },
    {
      n: 5,
      label: 'Build LLM Prompt',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'var(--status-success)',
      detail: "Allowed chunks are assembled into the LLM context window. The model NEVER sees restricted tokens. There is no risk of it guessing confidential content — the tokens are not in the prompt.",
      code: `context = "\\n\\n---\\n\\n".join([r["content"] for r in results])
messages.append({
    "role": "user",
    "content": f"Context:\\n{context}\\n\\nQuestion: {query}"
})
# For Alex (standard): context = "" → early return
# For Sarah (admin):   context = full confidential chunks`,
    },
  ]

  return (
    <div className="space-y-8">

      {/* Header callout */}
      <div className="p-4 rounded-2xl border"
        style={{ background: 'var(--ddn-red-light, #FFF0F1)', borderColor: 'rgba(237,39,56,0.2)' }}>
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--ddn-red)' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--ddn-red)' }}>
              Core Principle — Same bucket, surgically filtered
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Both users query the <strong>exact same Infinia bucket</strong> with the same FAISS index.
              RBAC is not a separate namespace, separate upload, or tenant split.
              It is a <strong>metadata tag</strong> stamped on each chunk at ingestion time,
              enforced at retrieval time — before the LLM ever receives a single token.
            </p>
          </div>
        </div>
      </div>

      {/* 5-Stage Pipeline */}
      <div>
        <SectionTitle><Layers className="w-4 h-4" style={{ color: 'var(--ddn-red)' }} /> The 5-Stage Pipeline</SectionTitle>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Click any stage to see the exact code path and what happens at that point.
        </p>

        <div className="flex flex-col gap-2">
          {PIPELINE.map((stage, i) => (
            <div key={stage.n}>
              <button
                onClick={() => setActiveStage(activeStage === stage.n ? null : stage.n)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  background: activeStage === stage.n ? `${stage.color}10` : 'var(--surface-secondary)',
                  borderColor: activeStage === stage.n ? `${stage.color}40` : 'var(--border-subtle)',
                }}>
                {/* Step number */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                  style={{ background: stage.color }}>
                  {stage.n}
                </div>
                {/* Icon + label */}
                <span style={{ color: stage.color }}>{stage.icon}</span>
                <span className="font-medium text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                  {stage.label}
                </span>
                {stage.n === 3 && (
                  <Tag color="var(--ddn-red)">RBAC Gate</Tag>
                )}
                <ChevronRight className="w-4 h-4 shrink-0 transition-transform"
                  style={{
                    color: 'var(--text-muted)',
                    transform: activeStage === stage.n ? 'rotate(90deg)' : 'rotate(0deg)',
                  }} />
              </button>

              {/* Connector arrow */}
              {i < PIPELINE.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90" style={{ color: 'var(--border-default)' }} />
                </div>
              )}

              {/* Expanded detail */}
              <AnimatePresence>
                {activeStage === stage.n && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden">
                    <div className="mt-2 mx-4 space-y-2">
                      <p className="text-xs leading-relaxed p-3 rounded-lg"
                        style={{ background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {stage.detail}
                      </p>
                      <CodeSnip>{stage.code}</CodeSnip>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* How metadata is organized */}
      <div>
        <SectionTitle><HardDrive className="w-4 h-4" style={{ color: 'var(--status-info)' }} /> How Metadata is Organized in Infinia</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border space-y-2"
            style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Infinia S3 Object (per chunk)
            </p>
            <CodeSnip>{`{
  "chunk_id": "abc123",
  "content": "Q4 revenue projections...",
  "metadata": {
    "source": "CONF_Q4_Projections.pdf",
    "classification": "confidential",  ← RBAC tag
    "chunk_index": 3,
    "total_chunks": 12
  }
}`}</CodeSnip>
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded-xl border"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Classification is auto-assigned at ingestion
              </p>
              <div className="space-y-1.5 text-xs">
                {[
                  { prefix: 'CONF_*', label: 'confidential', color: 'var(--ddn-red)' },
                  { prefix: 'CONFIDENTIAL_*', label: 'confidential', color: 'var(--ddn-red)' },
                  { prefix: 'INTERNAL_*', label: 'confidential', color: 'var(--ddn-red)' },
                  { prefix: 'SECRET_*', label: 'confidential', color: 'var(--ddn-red)' },
                  { prefix: 'Everything else', label: 'public', color: 'var(--status-info)' },
                ].map(r => (
                  <div key={r.prefix} className="flex items-center gap-2">
                    <code className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--surface-code, #0d1117)', color: '#c9d1d9' }}>
                      {r.prefix}
                    </code>
                    <ArrowRight className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <Tag color={r.color}>{r.label}</Tag>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl border"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                Performance characteristic
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                RBAC check is <strong>O(K)</strong> — a dict lookup on K results (typically 5–10).
                No database round-trip. Runs in microseconds regardless of total index size.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo talking points */}
      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: 'var(--status-success)' }} /> Demo Talking Points</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint
            icon="🗂️"
            title="Same bucket, different answers"
            body="Both users hit the exact same Infinia bucket and FAISS index. RBAC is not a separate namespace — it's metadata-driven filtering at query time." />
          <TalkingPoint
            icon="🔒"
            title="LLM never receives restricted tokens"
            body="The context window is built after RBAC filtering. There's no risk of model hallucination revealing confidential data — the tokens are never in the prompt." />
          <TalkingPoint
            icon="⚡"
            title="Zero performance overhead"
            body="RBAC is a dict lookup on top-K results — typically 5 checks. Not a DB round-trip, not an ACL service call. Microsecond latency." />
          <TalkingPoint
            icon="🏷️"
            title="Retroactive classification"
            body="The /reclassify endpoint re-stamps existing chunks with new tags without re-uploading. Infinia metadata mutation on existing objects." />
          <TalkingPoint
            icon="📐"
            title="Scales with Infinia"
            body="Whether 1,000 or 10 million chunks in the index, RBAC always runs on exactly K results — never a full scan." />
          <TalkingPoint
            icon="🏢"
            title="The Infinia differentiator"
            body="Classification tags live inside the Infinia S3 object alongside chunk text. No external ACL service. Policy travels with the data." />
        </div>
      </div>

      {/* What Alex vs Sarah sees */}
      <div>
        <SectionTitle><Info className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> Visual Outcome</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              name: 'Alex Chen', role: 'Standard User', color: 'var(--status-info)',
              steps: ['FAISS finds 8 chunks', 'RBAC drops 8/8 confidential', 'chunk_ids = []', 'Early return → ACCESS DENIED', 'LLM never called'],
              outcome: '🔒 Access Restricted',
            },
            {
              name: 'Sarah Mitchell', role: 'Executive Access', color: 'var(--ddn-red)',
              steps: ['FAISS finds 8 chunks', 'RBAC allows all 8', 'chunk_ids = [id1…id8]', 'S3 fetch → full content', 'LLM answers with context'],
              outcome: '✅ Full Answer',
            },
          ].map(user => (
            <div key={user.name} className="p-4 rounded-xl border"
              style={{ borderColor: `${user.color}30`, background: `${user.color}08` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: user.color }}>
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{user.role}</p>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {user.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="shrink-0 font-mono text-[10px] mt-0.5 w-4" style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>
                    <span style={{ color: i === 2 || i === 3 ? user.color : 'var(--text-secondary)' }}
                      className={i === 3 ? 'font-semibold' : ''}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs font-bold px-2 py-1 rounded-lg text-center"
                style={{ background: `${user.color}18`, color: user.color }}>
                {user.outcome}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CONCEPT 2: RAG Pipeline ────────────────────────────────────────────────

function RAGDetail() {
  const [activeTab, setActiveTab] = useState<'ingestion' | 'retrieval'>('ingestion')

  const INGESTION_STAGES = [
    {
      label: 'Upload PDF / document',
      icon: <Upload className="w-4 h-4" />,
      color: 'var(--status-info)',
      who: 'Frontend → POST /api/documents/upload',
      desc: 'User selects a file on the Documents page. The filename prefix (CONF_, INTERNAL_, etc.) is used to auto-assign the classification tag. A unique upload_id is returned immediately.',
    },
    {
      label: 'Semantic chunking via NVIDIA NvIngest',
      icon: <Layers className="w-4 h-4" />,
      color: 'var(--status-info)',
      who: 'Backend — NVIDIA NvIngest library',
      desc: 'NVIDIA NvIngest performs semantic chunking — instead of splitting on fixed token counts, it understands document structure (headings, paragraphs, tables) to produce semantically coherent chunks. Each chunk carries metadata: source filename, chunk index, total chunks, and the classification tag stamped from the filename prefix.',
    },
    {
      label: 'Embed each chunk (GPU)',
      icon: <Cpu className="w-4 h-4" />,
      color: 'var(--status-warning)',
      who: 'Backend — sentence-transformers on CUDA',
      desc: 'all-MiniLM-L6-v2 converts each text chunk into a 384-dim float32 vector. GPU (CUDA) dramatically speeds this up — visible as embeddings/sec in the ingestion progress bar. CPU fallback available.',
    },
    {
      label: 'Store chunks to Infinia S3',
      icon: <HardDrive className="w-4 h-4" />,
      color: 'var(--status-warning)',
      who: 'Backend — S3Handler (DDN Infinia)',
      desc: 'Each chunk is serialised as chunks/{chunk_id}.json and uploaded to Infinia S3. The file contains the raw text, metadata (classification, source, timestamp), and is immediately queryable. DDN latency measured per batch.',
    },
    {
      label: 'Mirror to AWS S3 (background)',
      icon: <Server className="w-4 h-4" />,
      color: 'var(--text-muted)',
      who: 'Backend — background thread pool',
      desc: 'AWS uploads run in a separate thread pool (not blocking the UI). This is the basis for the DDN vs AWS TTFB comparison shown after ingestion completes. AWS avg latency is streamed back via SSE once the background thread finishes.',
    },
    {
      label: 'Update FAISS index in memory',
      icon: <Database className="w-4 h-4" />,
      color: 'var(--status-success)',
      who: 'Backend — vector_store.py (in-memory)',
      desc: 'The new 384-dim vectors are added to the in-memory FAISS IndexFlatL2. chunk_metadata dict is updated mapping each FAISS index position → {chunk_id, metadata}. The document is immediately queryable.',
    },
    {
      label: 'Persist index to Infinia S3',
      icon: <HardDrive className="w-4 h-4" />,
      color: 'var(--status-success)',
      who: 'Backend — save_index_to_infinia()',
      desc: 'The FAISS index binary and chunk_metadata JSON are uploaded to Infinia S3 (faiss_index.bin, chunk_metadata.json). On any backend restart, these are reloaded sub-second — enabling the Cold Start demo.',
    },
    {
      label: 'Progress streamed via SSE',
      icon: <Zap className="w-4 h-4" />,
      color: 'var(--status-success)',
      who: 'Frontend — EventSource /api/documents/upload-progress/{id}',
      desc: 'Real-time progress events: chunk count, embedding speed, GPU vs CPU, provider latencies, AWS sync status. The Documents page progress bar and performance cards are all driven by this SSE stream.',
    },
  ]

  const RETRIEVAL_STAGES = [
    {
      label: 'User asks a question',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'var(--status-info)',
      who: 'Frontend',
      desc: 'Query sent via SSE to /api/rag/stream. Conversation history, model choice, and top_k are included.',
    },
    {
      label: 'Embed the query',
      icon: <Cpu className="w-4 h-4" />,
      color: 'var(--status-info)',
      who: 'Backend — sentence-transformers',
      desc: 'all-MiniLM-L6-v2 encodes the query into a 384-dim float32 vector. GPU (CUDA) used if available. Same model as ingestion — critical for semantic alignment.',
    },
    {
      label: 'FAISS similarity search',
      icon: <Database className="w-4 h-4" />,
      color: 'var(--status-info)',
      who: 'Backend — FAISS (in-memory)',
      desc: 'IndexFlatL2 finds top-K nearest chunks by L2 distance. The FAISS index is loaded from Infinia S3 on startup and held in RAM — sub-millisecond search regardless of index size.',
    },
    {
      label: 'RBAC metadata filter',
      icon: <Filter className="w-4 h-4" />,
      color: 'var(--ddn-red)',
      who: 'Backend — vector_store.py',
      desc: 'Each FAISS result\'s classification tag is checked against user role. Confidential chunks are silently dropped for standard-role users. If all results are filtered, ACCESS_DENIED is returned immediately — LLM never called.',
    },
    {
      label: 'Fetch allowed chunks from Infinia S3',
      icon: <HardDrive className="w-4 h-4" />,
      color: 'var(--status-success)',
      who: 'Backend — S3Handler (DDN + optional AWS)',
      desc: 'Only the cleared chunk IDs are downloaded from Infinia S3. DDN TTFB is measured for all chunks; AWS samples 1 chunk and extrapolates. This is where the performance comparison originates.',
    },
    {
      label: 'Build prompt + stream LLM',
      icon: <Zap className="w-4 h-4" />,
      color: 'var(--status-success)',
      who: 'Backend — NVIDIA NIM / Llama endpoint',
      desc: 'System prompt + conversation history + retrieved context + user question → streamed token by token via SSE back to the browser.',
    },
    {
      label: 'Tokens render in real time',
      icon: <Server className="w-4 h-4" />,
      color: 'var(--status-success)',
      who: 'Frontend — EventSource',
      desc: 'Each SSE data chunk carries a token. The Chat UI appends tokens as they arrive. Infinia TTFB chip and chunk count update live during streaming.',
    },
  ]

  const STAGES = activeTab === 'ingestion' ? INGESTION_STAGES : RETRIEVAL_STAGES

  return (
    <div className="space-y-8">

      {/* Header callout — changes per tab */}
      <div className="p-4 rounded-2xl border"
        style={{ background: 'var(--status-info-subtle)', borderColor: 'rgba(26,129,175,0.2)' }}>
        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--status-info)' }} />
          <div>
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--status-info)' }}>
              Retrieval-Augmented Generation — two distinct phases
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              RAG has two separate phases: <strong>Ingestion</strong> (PDF → chunks → vectors → Infinia S3)
              and <strong>Retrieval</strong> (question → FAISS → RBAC filter → LLM answer).
              Both use Infinia as the storage backbone — the ingestion latency demo and the query TTFB demo
              are both measuring different Infinia operations.
            </p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl border"
        style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)', width: 'fit-content' }}>
        {(['ingestion', 'retrieval'] as const).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            style={{
              background: activeTab === tab ? 'var(--surface-card)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
            {tab === 'ingestion'
              ? <><Upload className="w-3.5 h-3.5" /> Ingestion Flow</>
              : <><MessageSquare className="w-3.5 h-3.5" /> Retrieval Flow</>}
          </button>
        ))}
      </div>

      {/* Phase description */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="space-y-6">

          {/* Per-tab mini callout */}
          {activeTab === 'ingestion' ? (
            <div className="flex items-start gap-3 p-3 rounded-xl border text-xs"
              style={{ background: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.25)' }}>
              <Upload className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#CA8A04' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#CA8A04' }}>Ingestion</strong> happens once per document.
                Chunks are embedded on GPU, stored to Infinia S3, and the FAISS index is persisted —
                so the backend can restart and immediately serve queries without re-uploading.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-xl border text-xs"
              style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--status-success)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--status-success)' }}>Retrieval</strong> happens on every query.
                The FAISS index is already in RAM, so similarity search is sub-millisecond.
                RBAC filtering and Infinia S3 chunk fetch happen in sequence before the LLM sees any context.
              </p>
            </div>
          )}

          {/* Flow steps */}
          <div>
            <SectionTitle>
              <Layers className="w-4 h-4" style={{ color: 'var(--status-info)' }} />
              {activeTab === 'ingestion' ? 'Ingestion Pipeline (8 steps)' : 'Retrieval Pipeline (7 steps)'}
            </SectionTitle>
            <div className="relative">
              <div className="absolute left-[22px] top-8 bottom-8 w-0.5"
                style={{ background: 'var(--border-subtle)' }} />
              <div className="space-y-1">
                {STAGES.map((s, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 z-10"
                      style={{ background: `${s.color}18`, border: `2px solid ${s.color}30`, color: s.color }}>
                      {s.icon}
                    </div>
                    <div className="flex-1 py-2 pb-4">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                          style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                          {s.who}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* Talking points */}
          <div>
            <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: 'var(--status-success)' }} /> Talking Points</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeTab === 'ingestion' ? <>
                <TalkingPoint icon="⚡" title="GPU embedding at ingestion time"
                  body="Chunks are embedded once on GPU (CUDA) during ingestion. At query time, only the query is embedded — the stored vectors never need re-computation." />
                <TalkingPoint icon="🗂️" title="Classification happens at upload, not at query"
                  body="The CONF_ filename prefix is read once at ingestion and stamped into the chunk metadata. No runtime classification logic needed at query time." />
                <TalkingPoint icon="💾" title="Infinia as the persistence layer"
                  body="FAISS index and all chunk JSON files are persisted to Infinia S3. Backend restarts load them in seconds — no re-indexing needed. That's the Cold Start demo." />
                <TalkingPoint icon="📊" title="DDN vs AWS comparison at ingestion"
                  body="Both DDN Infinia and AWS S3 receive the same chunk files. Ingestion page shows DDN wins on per-chunk latency — same data, different speed." />
              </> : <>
                <TalkingPoint icon="📖" title="Grounded answers, not hallucinations"
                  body="The LLM only answers from retrieved context. If the document doesn't say it, the model says it doesn't know — no training-data guessing." />
                <TalkingPoint icon="⚡" title="TTFB is the key metric"
                  body="DDN INFINIA delivers chunks sub-millisecond vs AWS. Faster retrieval = faster first token = better experience at scale with many concurrent users." />
                <TalkingPoint icon="🔄" title="Conversation memory included"
                  body="Previous turns are included in the messages array. The LLM can refer back to earlier in the conversation naturally, using the same RAG context." />
                <TalkingPoint icon="🗂️" title="Infinia is the single source of truth"
                  body="FAISS index, raw chunks, metadata, audit logs — all on Infinia S3. The backend is fully stateless between restarts." />
              </>
              }
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Main Details Page ──────────────────────────────────────────────────────

export default function DetailsPage() {
  const [activeConcept, setActiveConcept] = useState('rbac')
  const concept = CONCEPTS.find(c => c.id === activeConcept)!

  const renderConcept = () => {
    if (!concept.ready) return <ComingSoon concept={concept} />
    switch (activeConcept) {
      case 'rbac': return <RBACDetail />
      case 'rag': return <RAGDetail />
      default: return <ComingSoon concept={concept} />
    }
  }

  return (
    <div className="flex gap-0 -m-6 md:-m-8" style={{ minHeight: '600px' }}>

      {/* ── Left concept navigator ─────────────────────────────────── */}
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
            Architecture reference & talking points
          </p>
        </div>

        {CONCEPTS.map(c => (
          <button key={c.id}
            onClick={() => setActiveConcept(c.id)}
            className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors rounded-none relative"
            style={{
              background: activeConcept === c.id ? 'var(--surface-card)' : 'transparent',
              borderLeft: activeConcept === c.id ? `3px solid ${c.tagColor}` : '3px solid transparent',
            }}>
            <span className="shrink-0 mt-0.5" style={{ color: activeConcept === c.id ? c.tagColor : 'var(--text-muted)' }}>
              {c.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight" style={{ color: activeConcept === c.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {c.label}
              </p>
              {!c.ready && (
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>coming soon</span>
              )}
            </div>
            {c.ready && activeConcept === c.id && (
              <CheckCircle className="w-3 h-3 shrink-0 ml-auto mt-0.5" style={{ color: c.tagColor }} />
            )}
          </button>
        ))}

        {/* Add-more hint */}
        <div className="mt-auto px-4 pt-4">
          <div className="p-2.5 rounded-lg border border-dashed text-[10px] leading-relaxed"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
            <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" />
            New concept? Add an entry to the <code className="font-mono">CONCEPTS</code> array in <code className="font-mono">Details.tsx</code>.
          </div>
        </div>
      </div>

      {/* ── Right content area ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeConcept}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="p-6 md:p-8">

            {/* Concept header */}
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

            {renderConcept()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
