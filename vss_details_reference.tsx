import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio, Database, Cpu, Layers, CheckCircle,
  MessageSquare, BookOpen, Zap, Filter,
  HardDrive, AlertTriangle, ArrowRight, Search,
  Camera, Activity, Cloud, Shield,
} from 'lucide-react'

// ── Concept registry ──────────────────────────────────────────────────────────
interface Concept {
  id:       string
  icon:     React.ReactNode
  label:    string
  tag:      string
  tagColor: string
  summary:  string
  ready:    boolean
}

const CONCEPTS: Concept[] = [
  {
    id:       'pipeline',
    icon:     <Layers className="w-5 h-5" />,
    label:    'AI Pipeline Overview',
    tag:      'Architecture',
    tagColor: '#76b900',
    summary:  'How raw RTSP/video flows through CLIP → FAISS → LLM into searchable intelligence',
    ready:    true,
  },
  {
    id:       'rtsp',
    icon:     <Radio className="w-5 h-5" />,
    label:    'Live RTSP Ingestion',
    tag:      'Live Demo',
    tagColor: '#ED2738',
    summary:  'How live camera streams become 10-second enriched chunks stored in INFINIA',
    ready:    true,
  },
  {
    id:       'search',
    icon:     <Search className="w-5 h-5" />,
    label:    'Semantic Search',
    tag:      'Core Feature',
    tagColor: '#3b82f6',
    summary:  'How natural language queries hit CLIP + FAISS to return sub-second results',
    ready:    true,
  },
  {
    id:       'infinia',
    icon:     <HardDrive className="w-5 h-5" />,
    label:    'DDN INFINIA Storage',
    tag:      'Infrastructure',
    tagColor: '#f59e0b',
    summary:  'Why INFINIA is the unified intelligence layer — not just object storage',
    ready:    true,
  },
  {
    id:       'enterprise',
    icon:     <Shield className="w-5 h-5" />,
    label:    'Enterprise Readiness',
    tag:      'Blueprint',
    tagColor: '#8b5cf6',
    summary:  'How every layer can be swapped for enterprise deployment at scale',
    ready:    true,
  },
]

// ── Shared sub-components ─────────────────────────────────────────────────────
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

function InfoBox({ color, icon, title, body }: { color: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="p-4 rounded-2xl border flex items-start gap-3"
      style={{ background: `${color}10`, borderColor: `${color}30` }}>
      <div style={{ color }} className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-bold text-sm mb-1" style={{ color }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
      </div>
    </div>
  )
}

// ── CONCEPT 1: AI Pipeline ────────────────────────────────────────────────────
function PipelineDetail() {
  const [activeStage, setActiveStage] = useState<number | null>(null)

  const PIPELINE = [
    {
      n: 1, label: 'RTSP / Video Ingest',
      icon: <Camera className="w-4 h-4" />, color: '#ED2738',
      detail: 'OpenCV connects to MediaMTX (RTSP) or reads an uploaded MP4. Frames are grabbed at 1 frame/2 seconds. For RTSP, every 10 seconds of frames are grouped into a "chunk" — a mini-clip with a defined time range.',
      code: 'cap = cv2.VideoCapture(rtsp_url)\nret, frame = cap.read()        # BGR frame\nframe_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)',
    },
    {
      n: 2, label: 'CLIP GPU Embedding',
      icon: <Cpu className="w-4 h-4" />, color: '#76b900',
      detail: 'Each frame is converted to a PIL Image and passed through NVIDIA CLIP (ViT-B/32). The model outputs a 512-dimensional float32 vector representing the visual semantics. This embedding is GPU-accelerated and runs in <50ms per frame.',
      code: 'image = preprocess(pil_img).unsqueeze(0).to(device)\nwith torch.no_grad():\n    embedding = model.encode_image(image)  # → float32[512]\n    embedding /= embedding.norm()           # L2-normalize',
    },
    {
      n: 3, label: 'BLIP Captioning',
      icon: <MessageSquare className="w-4 h-4" />, color: '#3b82f6',
      detail: 'BLIP (Bootstrapping Language-Image Pre-training) generates a natural language description of the frame content — "a car in a parking lot", "people walking near a building". This caption becomes searchable metadata alongside the CLIP vector.',
      code: 'inputs = blip_processor(images=pil_img, return_tensors="pt").to(device)\nout = blip_model.generate(**inputs)\ncaption = blip_processor.decode(out[0], skip_special_tokens=True)',
    },
    {
      n: 4, label: 'LLM Enrichment',
      icon: <Zap className="w-4 h-4" />, color: '#8b5cf6',
      detail: 'The BLIP caption and visual tags are passed to an LLM (GPT-4o or Ollama locally). The LLM adds semantic tags, scene classification, anomaly flags, and a structured summary — turning a raw caption into rich, queryable metadata.',
      code: 'prompt = f"Frame caption: {caption}\\nGenerate: tags, scene_type, objects, anomalies"\nresponse = openai.chat.completions.create(\n    model="gpt-4o-mini", messages=[{"role":"user","content":prompt}])',
    },
    {
      n: 5, label: 'FAISS Indexing',
      icon: <Database className="w-4 h-4" />, color: '#8b5cf6',
      detail: 'The 512-dim CLIP vector is added to a GPU FAISS IndexFlatIP (inner product on L2-normalized vectors = cosine similarity). The index is auto-saved to disk every 50 frames and auto-reloaded on restart — no cold-start re-indexing needed.',
      code: 'index.add(embedding.cpu().numpy())  # in-place GPU index add\nif frame_count % 50 == 0:\n    faiss.write_index(index, "data/faiss/index.faiss")',
    },
    {
      n: 6, label: 'INFINIA S3 Storage',
      icon: <Cloud className="w-4 h-4" />, color: '#10b981',
      detail: 'Every 5th frame keyframe (JPEG) and its metadata JSON (tags, caption, stream, timestamp, CLIP vector) are uploaded to DDN INFINIA S3. This makes frames persistently searchable even after backend restart — INFINIA is the single source of truth.',
      code: 's3.put_object(Bucket="vss", Key=f"frames/{stream_id}/{frame_id}.jpg", Body=jpeg)\ns3.put_object(Bucket="vss", Key=f"frames/{stream_id}/{frame_id}.json", Body=json.dumps(meta))',
    },
  ]

  return (
    <div className="space-y-8">
      <InfoBox
        color="#76b900"
        icon={<Activity className="w-5 h-5" />}
        title="Core Principle — Every pixel becomes a queryable vector"
        body="Raw video from any source (RTSP, MP4, S3) is broken into frames, each embedded into a 512-dim CLIP vector. The FAISS index co-located on GPU means semantic search across thousands of frames returns results in under 1ms — no separate vector database, no network round-trips."
      />

      {/* 6-Stage Pipeline */}
      <div>
        <SectionTitle><ArrowRight className="w-4 h-4" style={{ color: '#76b900' }} /> 6-Stage Pipeline</SectionTitle>
        <div className="space-y-2">
          {PIPELINE.map((s) => (
            <div key={s.n}>
              <button
                onClick={() => setActiveStage(activeStage === s.n ? null : s.n)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  background: activeStage === s.n ? `${s.color}0D` : 'var(--surface-secondary)',
                  borderColor: activeStage === s.n ? `${s.color}40` : 'var(--border-subtle)',
                }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}18`, color: s.color }}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>0{s.n}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform"
                  style={{ color: 'var(--text-muted)', transform: activeStage === s.n ? 'rotate(90deg)' : 'none' }} />
              </button>
              <AnimatePresence>
                {activeStage === s.n && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden">
                    <div className="px-4 pb-3 pt-1 space-y-2"
                      style={{ borderLeft: `2px solid ${s.color}40`, marginLeft: '14px' }}>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.detail}</p>
                      <CodeSnip>{s.code}</CodeSnip>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Talking points */}
      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: '#76b900' }} /> Talking Points</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="🎯" title="One GPU, the whole pipeline"
            body="CLIP embedding, BLIP captioning, FAISS indexing — all co-located on the same GPU. No network I/O between AI stages. A single A100 can process 3+ simultaneous RTSP streams in real time." />
          <TalkingPoint icon="💾" title="FAISS is persistent, not ephemeral"
            body="The index is written to disk (data/faiss/index.faiss) every 50 frames. On backend restart it's reloaded in seconds — no re-processing needed. INFINIA makes it a durable, production-grade store." />
          <TalkingPoint icon="🔗" title="CLIP is the universal bridge"
            body="The same CLIP model that embeds frames also embeds text queries. 'Car near entrance' and a frame of a car use the same 512-dim embedding space — that's why the search works without any keyword matching." />
          <TalkingPoint icon="⚡" title="LLM enrichment is optional at demo time"
            body="If OpenAI keys aren't available, Ollama runs locally. The demo degrades gracefully — CLIP + BLIP still work. Mention this to technical audiences: the AI stack is modular, not monolithic." />
        </div>
      </div>
    </div>
  )
}

// ── CONCEPT 2: Live RTSP ──────────────────────────────────────────────────────
function RTSPDetail() {
  return (
    <div className="space-y-8">
      <InfoBox
        color="#ED2738"
        icon={<Radio className="w-5 h-5" />}
        title="Core Principle — RTSP becomes a searchable intelligence stream"
        body="Unlike frame-by-frame capture, VSS groups frames into 10-second chunks. Each chunk is a mini-video clip with a complete metadata payload: object detections, CLIP embedding, LLM caption, and timestamps. These chunks are stored to INFINIA and indexed into FAISS — making live video permanently searchable."
      />

      {/* How to demo */}
      <div>
        <SectionTitle><Activity className="w-4 h-4" style={{ color: '#ED2738' }} /> How to Demo This</SectionTitle>
        <div className="space-y-3">
          {[
            { n: '01', title: 'Go to Demo → Live Streams', desc: 'Click the Live Streams tab in the sidebar. You\'ll see the Add RTSP Stream form.' },
            { n: '02', title: 'Select "Parking Lot — Cam 1" preset', desc: 'Click the preset button to auto-fill the RTSP URL (rtsp://172.20.146.6:8554/cam1). Hit "Start Ingestion".' },
            { n: '03', title: 'Watch the Chunk Builder animate', desc: 'Below the video feed a "10s Chunk Builder" panel appears. It shows a real-time progress bar counting 0s→10s. Every 10 seconds the panel flashes green "STORED → INFINIA" and a new chunk ID starts.' },
            { n: '04', title: 'Point out object detection', desc: 'The red badge "🚗 X cars" updates every ~6 seconds — this simulates YOLOv8 object detection counting vehicles. For Cam 2 (Lobby) it shows people. For Cam 3 (Entrance) it shows shoppers.' },
            { n: '05', title: 'Show the LLM caption evolving', desc: 'As vehicle count grows (5→25 over the 19-second clip), the LLM caption adapts: "Light traffic" → "Moderate traffic" → "Heavy vehicle traffic, count increasing". Demonstrates context-aware AI captioning.' },
            { n: '06', title: 'Switch to Search and prove it\'s queryable', desc: 'After 30+ seconds, go to Demo → Search. Type "car in parking lot" — results from the live stream appear with timestamps and stream labels. Live video is now searchable.' },
          ].map(s => (
            <div key={s.n} className="flex gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                style={{ background: 'rgba(237,39,56,0.1)', color: '#ED2738' }}>{s.n}</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chunk metadata structure */}
      <div>
        <SectionTitle><Database className="w-4 h-4" style={{ color: '#ED2738' }} /> What Gets Stored Per Chunk</SectionTitle>
        <CodeSnip>{`# metadata.json stored per chunk in INFINIA S3
{
  "chunk_id":    "cam1_chunk_0021",
  "stream_id":   "rtsp-4044c6bf",
  "stream_name": "Parking Lot — Cam 1",
  "timestamp":   "2026-07-23T11:47:35Z",
  "duration_s":  10,
  "frame_count": 5,
  "objects": {
    "cars":   7,
    "people": 0,
    "model":  "YOLOv8",
    "conf":   0.6
  },
  "clip_embedding":  [0.023, -0.147, ...],  // 512-dim float32
  "blip_caption":    "multiple vehicles on a road near buildings",
  "llm_enrichment":  {
    "scene":     "outdoor-roadway",
    "tags":      ["vehicles", "traffic", "daytime"],
    "anomalies": [],
    "summary":   "Moderate vehicle traffic on roadway..."
  },
  "s3_path": "s3://vss/rtsp/cam1/chunk_0021.mp4"
}`}</CodeSnip>
      </div>

      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: '#ED2738' }} /> Talking Points</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="📦" title="10-second chunks are the key insight"
            body="Traditional RTSP systems capture frames. VSS captures structured intelligence. Each chunk is a queryable, enriched asset — not just a JPEG. Ask: 'What did your CCTV system do with the last 10 seconds? Ours stored a searchable mini-document.'" />
          <TalkingPoint icon="🚗" title="Object detection demonstrates AI awareness"
            body="The car count badge isn't cosmetic — it represents YOLOv8 running on every frame. A client seeing '7 cars detected' understands immediately that the system has semantic awareness, not just pixel storage." />
          <TalkingPoint icon="🔄" title="RTSP + uploaded video use the same pipeline"
            body="Same CLIP model, same FAISS index, same INFINIA bucket. Live cameras and archived footage are unified into one searchable estate. This is the key differentiator: no separate live vs. archive search." />
          <TalkingPoint icon="💡" title="MediaMTX is the demo RTSP server"
            body="In production, the RTSP URL would be an IP camera (e.g. rtsp://192.168.x.x:554/stream). For the demo, MediaMTX loops 3 video files as RTSP streams. The pipeline is identical — mention this to avoid confusion." />
        </div>
      </div>
    </div>
  )
}

// ── CONCEPT 3: Semantic Search ────────────────────────────────────────────────
function SearchDetail() {
  return (
    <div className="space-y-8">
      <InfoBox
        color="#3b82f6"
        icon={<Search className="w-5 h-5" />}
        title="Core Principle — Text and video share the same embedding space"
        body="CLIP was trained on 400M image-text pairs. It learned that 'a car near an entrance' and a photo of a car near a door are close together in a 512-dim vector space. VSS exploits this: text queries and video frames are embedded by the same model, so cosine similarity is meaningful search — not keyword matching."
      />

      <div>
        <SectionTitle><Filter className="w-4 h-4" style={{ color: '#3b82f6' }} /> Query-Time Flow</SectionTitle>
        <div className="space-y-2">
          {[
            { step: 'User types query', detail: '"Car near entrance at night"', color: '#3b82f6' },
            { step: 'CLIP text encoder', detail: 'Query → 512-dim float32 vector in <5ms (GPU)', color: '#3b82f6' },
            { step: 'FAISS.search(k=20)', detail: 'Cosine similarity across all indexed frame vectors. Returns top-20 by score. IndexFlatIP is exact — no approximation.', color: '#76b900' },
            { step: 'Score threshold filter', detail: 'Results with similarity < 0.25 dropped. Prevents low-relevance returns.', color: '#f59e0b' },
            { step: 'Metadata lookup', detail: 'For each FAISS result → fetch stream name, timestamp, tags, caption from in-memory metadata dict.', color: '#10b981' },
            { step: 'S3 frame URL returned', detail: 'Result includes pre-signed INFINIA S3 URL for the keyframe JPEG — client renders it instantly.', color: '#10b981' },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300 mt-3 shrink-0 -ml-1" />}
              <div className={`flex-1 px-3 py-2 rounded-lg border text-xs ${i === 0 ? 'font-bold' : ''}`}
                style={{
                  background: i === 0 ? 'white' : `${s.color}08`,
                  borderColor: `${s.color}25`,
                  color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginLeft: i === 0 ? 0 : undefined,
                }}>
                <span className="font-semibold" style={{ color: s.color }}>{s.step}</span>
                {i > 0 && <span className="ml-1">— {s.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: '#3b82f6' }} /> Demo Queries That Impress</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            { q: '"Car near entrance"',      why: 'Classic CCTV use case. Matches parking lot frames even though the video has no text metadata.' },
            { q: '"People walking indoors"', why: 'Matches lobby footage. Shows cross-camera semantic awareness.' },
            { q: '"Crowded area"',           why: 'Returns frames with multiple people. No keyword "crowd" in any metadata.' },
            { q: '"Night scene"',            why: 'Returns low-light frames. CLIP understands lighting context, not just objects.' },
            { q: '"Vehicle collision"',      why: 'Matches frames with closely-spaced cars. Synonymy demo — no word "collision" in captions.' },
            { q: '"Empty parking"',          why: 'Returns frames with few/no cars. Negative-space semantics.' },
          ].map(s => (
            <div key={s.q} className="p-3 rounded-xl border"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
              <code className="text-[11px] font-mono font-bold" style={{ color: '#3b82f6' }}>{s.q}</code>
              <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.why}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: '#3b82f6' }} /> Talking Points</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="🔤" title="No keywords, no tags, no training needed"
            body="The query 'vehicle collision' matches frames of cars close together — even though no metadata says 'collision'. CLIP understands semantic meaning, not string matching. This is the core demo moment." />
          <TalkingPoint icon="⚡" title="Under 1ms FAISS search time"
            body="IndexFlatIP on GPU with 10,000+ vectors searches in <1ms. This is exact nearest-neighbour — not approximate. At 1M vectors it's still <10ms. Mention this when asked about scale." />
          <TalkingPoint icon="🌐" title="Video Search vs. Frame Search"
            body="The Frame Search tab returns individual keyframes. The Video Search tab returns full video segments ranked by relevance. Both use the same FAISS index — just different result aggregation." />
          <TalkingPoint icon="📊" title="Similarity score is meaningful"
            body="Scores range 0–1. Above 0.5 = strong match. Between 0.25–0.5 = loose match. Below 0.25 = filtered. Show the scores in results to demonstrate the model's confidence — it resonates with technical audiences." />
        </div>
      </div>
    </div>
  )
}

// ── CONCEPT 4: DDN INFINIA ────────────────────────────────────────────────────
function InfiniaDetail() {
  return (
    <div className="space-y-8">
      <InfoBox
        color="#f59e0b"
        icon={<HardDrive className="w-5 h-5" />}
        title="Core Principle — INFINIA is the constant. The vector engine is configurable."
        body="INFINIA stores what gives a search result its meaning: the raw frame, the metadata JSON, the LLM enrichment, the RTSP clip. The vector index layer — FAISS today, Milvus at enterprise scale — is separate and swappable. INFINIA's role never changes across any deployment. That's why it's the foundation, not a feature."
      />

      <div>
        <SectionTitle><Activity className="w-4 h-4" style={{ color: '#f59e0b' }} /> What INFINIA Stores in VSS</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Keyframe JPEGs',  icon: '🖼️', desc: 'Every 5th frame from each stream/upload — the permanent visual record', color: '#ED2738' },
            { label: 'Metadata JSON',   icon: '📋', desc: 'Tags, caption, objects, timestamp per frame — co-located with the asset', color: '#3b82f6' },
            { label: 'FAISS Index File',icon: '🧮', desc: 'index.faiss persisted here, loaded into app memory at runtime — NOT a separate DB service', color: '#76b900' },
            { label: 'RTSP Chunk MP4s', icon: '🎬', desc: '10-second video clips from live streams, stored permanently', color: '#8b5cf6' },
            { label: 'Uploaded Videos', icon: '📹', desc: 'Original MP4/MOV files ingested via Media Intelligence tab', color: '#f59e0b' },
            { label: 'LLM Enrichments', icon: '🤖', desc: 'GPT-4o / Ollama structured outputs per frame/chunk', color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-3 p-3 rounded-xl border"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-xl shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: '#f59e0b' }} /> Talking Points</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="🏗️" title="INFINIA stores what makes results meaningful"
            body="Raw frames, metadata JSONs, LLM enrichments, RTSP clips — all on INFINIA. FAISS is an in-process library that loads its index FILE from INFINIA at startup. When you get a search result, INFINIA delivers the asset. That's its irreplaceable role at every scale." />
          <TalkingPoint icon="🚀" title="GPU-Direct NVMe eliminates the CPU bottleneck"
            body="Traditional storage: disk → CPU → GPU. INFINIA: disk → GPU directly via NVMe. For CLIP embedding at 60fps+ this is the difference between keeping up and dropping frames. Mention this to infrastructure-focused audiences." />
          <TalkingPoint icon="📏" title="Flat namespace scales linearly"
            body="A 1PB INFINIA archive and a 100PB archive respond with identical latency. There's no tiering, no cold-retrieval delay, no index rebuilding. One architecture decision eliminates the 'what happens when we grow' conversation." />
          <TalkingPoint icon="🔄" title="INFINIA + Milvus are complementary, not competing"
            body="At enterprise scale you add Milvus for distributed vector search — but INFINIA still stores every raw asset, metadata payload, and enrichment. Milvus finds the vector; INFINIA delivers the content behind it. Both layers are always present. Only the vector engine changes." />
        </div>
      </div>
    </div>
  )
}

// ── CONCEPT 5: Enterprise Readiness ──────────────────────────────────────────
function EnterpriseDetail() {
  const SWAP_TABLE = [
    { layer: 'Vector Engine',    demo: 'FAISS (in-process library)',   enterprise: ['Milvus (distributed)', 'Weaviate', 'pgvector — sits alongside INFINIA, not replacing it'], color: '#76b900' },
    { layer: 'AI Data Platform', demo: 'DDN INFINIA ← constant at every scale', enterprise: ['DDN INFINIA (enterprise tier) — asset + metadata layer always present'], color: '#f59e0b' },
    { layer: 'Stream Ingest',    demo: 'MediaMTX + sample videos',    enterprise: ['Enterprise RTSP cameras', 'Kafka + Kinesis', 'NVIDIA DeepStream'], color: '#ED2738' },
    { layer: 'LLM / VLM',        demo: 'Ollama 7B + GPT-4o-mini',     enterprise: ['Azure OpenAI', 'AWS Bedrock', 'NVIDIA NIM microservices'], color: '#8b5cf6' },
    { layer: 'Deployment',       demo: 'PM2 · single server',          enterprise: ['Kubernetes (K8s)', 'Docker Swarm', 'NVIDIA DGX Cloud'], color: '#3b82f6' },
    { layer: 'Object Detection', demo: 'Simulated (YOLOv8 demo mode)', enterprise: ['YOLOv8 real-time', 'NVIDIA TAO', 'Metropolis SDK'], color: '#10b981' },
  ]

  return (
    <div className="space-y-8">
      <InfoBox
        color="#8b5cf6"
        icon={<Shield className="w-5 h-5" />}
        title="Reference Blueprint — INFINIA is constant. Everything else is configurable."
        body="VSS demonstrates the pattern: RTSP → Embed → Index → Search. INFINIA is the one layer that never changes — it stores the raw assets and metadata at every scale. The vector engine (FAISS → Milvus), the LLM, the ingest method, the deployment platform — all configurable. The data architecture stays identical."
      />

      {/* Swap table */}
      <div>
        <SectionTitle><Layers className="w-4 h-4" style={{ color: '#8b5cf6' }} /> Demo → Enterprise Layer Mapping</SectionTitle>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="grid grid-cols-3 gap-0 px-4 py-2 text-[9px] font-black uppercase tracking-widest"
            style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            <span>Layer</span><span style={{ color: '#76b900' }}>Prototype (This Demo)</span><span style={{ color: '#3b82f6' }}>Enterprise Options</span>
          </div>
          {SWAP_TABLE.map((row, i) => (
            <div key={row.layer} className="grid grid-cols-3 gap-0 px-4 py-3 items-center text-xs"
              style={{
                background: i % 2 === 0 ? 'var(--surface-secondary)' : 'var(--surface-card)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
              <div className="font-bold text-[10px] uppercase" style={{ color: row.color }}>{row.layer}</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: row.color }} />
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.demo}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {row.enterprise.map(e => (
                  <span key={e} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle><MessageSquare className="w-4 h-4" style={{ color: '#8b5cf6' }} /> Talking Points</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TalkingPoint icon="🔌" title="The pipeline pattern is what matters, not the components"
            body="Whether the client uses Milvus or FAISS, K8s or PM2, GPT-4o or a private LLM — the data contract is the same. RTSP frames become 512-dim vectors stored with metadata. The search API doesn't change. Configurable infrastructure, identical outcomes." />
          <TalkingPoint icon="🏢" title="Kubernetes for scale, same code"
            body="The backend is a FastAPI service in a single container today. Deploying to K8s with horizontal pod autoscaling requires zero code changes — only a Helm chart. Mention this when clients ask 'what about 1000 cameras?'" />
          <TalkingPoint icon="🔒" title="RBAC and multi-tenancy are add-ons, not rewrites"
            body="The metadata JSON stored per frame can carry access control labels. A thin filter layer between FAISS results and API response enforces RBAC — same pattern as the DDN RAG demo. Architecture is already separation-of-concern ready." />
          <TalkingPoint icon="📡" title="NVIDIA DeepStream for true real-time"
            body="The demo uses OpenCV at 1 frame/2s. DeepStream handles 60fps, multi-stream, with hardware-accelerated decode directly on GPU. For a client running 500+ cameras, DeepStream + INFINIA is the production recommendation — mention this proactively." />
        </div>
      </div>
    </div>
  )
}

// ── Main Details Page ─────────────────────────────────────────────────────────
export default function DetailsPage() {
  const [activeConcept, setActiveConcept] = useState('pipeline')
  const concept = CONCEPTS.find(c => c.id === activeConcept)!

  const renderConcept = () => {
    switch (activeConcept) {
      case 'pipeline':   return <PipelineDetail />
      case 'rtsp':       return <RTSPDetail />
      case 'search':     return <SearchDetail />
      case 'infinia':    return <InfiniaDetail />
      case 'enterprise': return <EnterpriseDetail />
      default:           return <PipelineDetail />
    }
  }

  return (
    <div className="flex gap-0 -m-6 md:-m-8" style={{ minHeight: '600px' }}>

      {/* Left concept navigator */}
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
              <p className="text-xs font-medium leading-tight"
                style={{ color: activeConcept === c.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {c.label}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.tag}</p>
            </div>
            {activeConcept === c.id && (
              <CheckCircle className="w-3 h-3 shrink-0 ml-auto mt-0.5" style={{ color: c.tagColor }} />
            )}
          </button>
        ))}

        <div className="mt-auto px-4 pt-4">
          <div className="p-2.5 rounded-lg border border-dashed text-[10px] leading-relaxed"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
            <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" />
            Add new concepts in the <code className="font-mono">CONCEPTS</code> array in <code className="font-mono">Details.tsx</code>.
          </div>
        </div>
      </div>

      {/* Right content area */}
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
