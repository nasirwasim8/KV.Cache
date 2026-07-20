import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, TrendingUp, DollarSign, Zap, Users, ChevronDown, ChevronUp, Info, Server, Cloud, AlertTriangle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type TierKey = 'self_hosted_h100' | 'azure_a100' | 'openai_gpt4'
type TierType = 'self_hosted' | 'cloud_api'

interface Preset {
  id: string; icon: string; label: string; industry: string
  systemTokens: number; dailyRequests: number; avgNewTokens: number
  hitRate: number; tier: TierKey; color: string
}
interface TierConfig {
  label: string; type: TierType; costPer1kTokens: number
  gpuServerCostUSD: number; gpuPowerWatts: number
  electricityCostPerKwh: number; color: string; description: string
}

// ─── Pricing Tiers ────────────────────────────────────────────────────────────
const TIERS: Record<string, TierConfig> = {
  self_hosted_h100: {
    label: 'Self-Hosted / On-Prem H100',
    type: 'self_hosted',
    costPer1kTokens: 0,          // sunk cost — GPU already paid
    gpuServerCostUSD: 300_000,   // 8× H100 DGX server ≈ $300K
    gpuPowerWatts: 6400,         // 8× H100 @ 700W each
    electricityCostPerKwh: 0.10,
    color: '#76B900',
    description: 'GPU already purchased. Value = throughput gain + CapEx avoidance + power savings.',
  },
  azure_a100: {
    label: 'Cloud (Azure / AWS A100)',
    type: 'cloud_api',
    costPer1kTokens: 0.0020,
    gpuServerCostUSD: 0,
    gpuPowerWatts: 0,
    electricityCostPerKwh: 0,
    color: '#1A81AF',
    description: 'Pay per token — every skipped prefill token is a direct dollar saving on your invoice.',
  },
  openai_gpt4: {
    label: 'API (OpenAI GPT-4o)',
    type: 'cloud_api',
    costPer1kTokens: 0.0050,
    gpuServerCostUSD: 0,
    gpuPowerWatts: 0,
    electricityCostPerKwh: 0,
    color: '#ED2738',
    description: 'Pay per token — every skipped prefill token is a direct dollar saving on your invoice.',
  },
}

// ─── Industry Presets ─────────────────────────────────────────────────────────
const PRESETS: Preset[] = [
  { id: 'contact_center', icon: '📞', label: 'Contact Center AI',      industry: 'Telecom / BPO',              systemTokens: 50_000,  dailyRequests: 500_000,   avgNewTokens: 200, hitRate: 85, tier: 'self_hosted_h100', color: '#ED2738' },
  { id: 'legal_ai',       icon: '⚖️', label: 'Legal Document AI',      industry: 'Law Firm / LegalTech',       systemTokens: 120_000, dailyRequests: 50_000,    avgNewTokens: 500, hitRate: 70, tier: 'azure_a100',       color: '#1A81AF' },
  { id: 'healthcare',     icon: '🏥', label: 'Clinical Decision AI',   industry: 'Hospital / Health System',   systemTokens: 80_000,  dailyRequests: 100_000,   avgNewTokens: 300, hitRate: 75, tier: 'azure_a100',       color: '#00C280' },
  { id: 'fintech',        icon: '🏦', label: 'Financial Analyst AI',   industry: 'Investment Bank / FinTech',  systemTokens: 200_000, dailyRequests: 25_000,    avgNewTokens: 800, hitRate: 60, tier: 'self_hosted_h100', color: '#f59e0b' },
  { id: 'ecommerce',      icon: '🛒', label: 'Retail / E-commerce AI', industry: 'Retail / Marketplace',       systemTokens: 30_000,  dailyRequests: 2_000_000, avgNewTokens: 100, hitRate: 90, tier: 'openai_gpt4',      color: '#8b5cf6' },
  { id: 'custom',         icon: '⚙️', label: 'Custom Scenario',         industry: 'Your Organization',          systemTokens: 10_000,  dailyRequests: 100_000,   avgNewTokens: 250, hitRate: 70, tier: 'self_hosted_h100', color: '#6b7280' },
]

// ─── Math Engine ──────────────────────────────────────────────────────────────
function computeROI(p: { systemTokens: number; dailyRequests: number; avgNewTokens: number; hitRate: number; tier: string }) {
  const { systemTokens, dailyRequests, avgNewTokens, hitRate, tier } = p
  const t = TIERS[tier]
  const hitFraction = hitRate / 100

  const dailyHits   = Math.round(dailyRequests * hitFraction)
  const dailyMisses = Math.round(dailyRequests * (1 - hitFraction))

  // H100 throughput: ~3,000 tokens/sec in prefill (conservative)
  const tokensPerSec        = 3_000
  const secSavedPerHit      = systemTokens / tokensPerSec
  const gpuSecSavedPerDay   = secSavedPerHit * dailyHits
  const gpuHoursSavedPerDay = gpuSecSavedPerDay / 3600
  const gpuHoursSavedMonthly = gpuHoursSavedPerDay * 30
  const gpuHoursSavedAnnually = gpuHoursSavedPerDay * 365

  // Throughput multiplier: with cache hits, same GPU can serve X× more requests
  const throughputMultiplier = (systemTokens + avgNewTokens) / avgNewTokens

  // ── CLOUD (pay-per-token) ─────────────────────────────────────────────────
  const costPerTokenCloud = t.costPer1kTokens / 1000
  const savingsPerHitCloud  = systemTokens * costPerTokenCloud
  const dailySavingsCloud   = dailyHits * savingsPerHitCloud
  const monthlySavingsCloud = dailySavingsCloud * 30
  const annualSavingsCloud  = dailySavingsCloud * 365
  const costNoCache         = dailyRequests * (systemTokens + avgNewTokens) * costPerTokenCloud
  const costWithCache       = (dailyHits * avgNewTokens + dailyMisses * (systemTokens + avgNewTokens)) * costPerTokenCloud
  const costReductionPct    = costNoCache > 0 ? ((costNoCache - costWithCache) / costNoCache) * 100 : 0

  // ── SELF-HOSTED (capacity / CapEx / OpEx) ────────────────────────────────
  // GPU server CapEx avoidance: if you'd need N servers without caching,
  // with caching you need N / throughputMultiplier servers for the same load.
  // Effective GPU servers freed = dailyHits * secSavedPerHit / (24h * 3600s) * numServers
  // Simpler: GPU utilisation freed = gpuHoursSavedAnnually / (24*365)
  const gpuUtilFreedPct = Math.min(99, (gpuHoursSavedAnnually / (24 * 365)) * 100)

  // CapEx avoidance: GPU servers NOT purchased at next expansion
  // Assume org is growing and would need 1 more DGX server per ~200K daily requests served
  const serversNeededWithout = Math.ceil(dailyRequests / 200_000)
  const serversNeededWith    = Math.ceil((dailyMisses + dailyHits / throughputMultiplier) / 200_000)
  const serversAvoided       = Math.max(0, serversNeededWithout - serversNeededWith)
  const capexAvoidance       = serversAvoided * t.gpuServerCostUSD

  // Power savings (OpEx): GPUs use less power when not doing prefill
  // GPU power ∝ compute load. Freed GPU-hours × power draw
  const powerSavedKWhAnnually  = (gpuHoursSavedAnnually * t.gpuPowerWatts) / 1000
  const powerSavedUsdAnnually  = powerSavedKWhAnnually * t.electricityCostPerKwh

  // Total self-hosted value (CapEx avoidance amortised over 3-year server life + annual power savings)
  const annualCapexAmortised = capexAvoidance / 3
  const totalSelfHostedAnnual = annualCapexAmortised + powerSavedUsdAnnually

  return {
    tierType: t.type,
    // Shared
    dailyHits, dailyMisses,
    gpuHoursSavedPerDay, gpuHoursSavedMonthly, gpuHoursSavedAnnually,
    throughputMultiplier,
    // Cloud
    savingsPerHitCloud, dailySavingsCloud, monthlySavingsCloud, annualSavingsCloud,
    costNoCache, costWithCache, costReductionPct,
    // Self-hosted
    serversAvoided, capexAvoidance, annualCapexAmortised,
    powerSavedKWhAnnually, powerSavedUsdAnnually,
    totalSelfHostedAnnual, gpuUtilFreedPct,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(0)}`
const fmtNum = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : n.toLocaleString()

// ─── Sub-components ───────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, onChange, format, hint, color = '#ED2738' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string; hint?: string; color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>
        <span className="font-mono font-bold text-sm px-3 py-0.5 rounded-lg" style={{ background: `${color}18`, color }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} ${pct}%, var(--surface-secondary) ${pct}%)`, accentColor: color }}
      />
      {hint && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

function KpiCard({ value, label, sublabel, color = '#00C280', suffix = '' }: {
  value: string; label: string; sublabel?: string; color?: string; suffix?: string
}) {
  return (
    <motion.div key={value + label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="text-center p-4 rounded-2xl" style={{ background: `${color}0f`, border: `1px solid ${color}25` }}>
      <div className="font-mono font-black leading-none mb-1" style={{ color, fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)' }}>
        {value}{suffix}
      </div>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color: `${color}bb` }}>{label}</div>
      {sublabel && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sublabel}</div>}
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ROICalculator() {
  const initial = PRESETS[0]
  const [activePreset, setActivePreset]   = useState('contact_center')
  const [systemTokens, setSystemTokens]   = useState(initial.systemTokens)
  const [dailyRequests, setDailyRequests] = useState(initial.dailyRequests)
  const [avgNewTokens, setAvgNewTokens]   = useState(initial.avgNewTokens)
  const [hitRate, setHitRate]             = useState(initial.hitRate)
  const [tier, setTier]                   = useState<string>(initial.tier)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const roi = useMemo(() => computeROI({ systemTokens, dailyRequests, avgNewTokens, hitRate, tier }), [systemTokens, dailyRequests, avgNewTokens, hitRate, tier])

  const applyPreset = (p: Preset) => {
    setActivePreset(p.id); setSystemTokens(p.systemTokens); setDailyRequests(p.dailyRequests)
    setAvgNewTokens(p.avgNewTokens); setHitRate(p.hitRate); setTier(p.tier)
  }

  const accent = PRESETS.find(p => p.id === activePreset)?.color ?? '#ED2738'
  const isCloud = TIERS[tier].type === 'cloud_api'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="section-header">
        <h2 className="section-title flex items-center gap-2">
          <Calculator className="w-6 h-6" style={{ color: 'var(--ddn-red)' }} />
          Enterprise ROI Calculator
        </h2>
        <p className="section-description">
          Plug in your real workload parameters. The calculator uses two separate economic models:
          <strong> direct cost savings</strong> for cloud/API billing, and <strong>throughput gain + CapEx avoidance + power savings</strong> for self-hosted GPU infrastructure.
        </p>
      </div>

      {/* Tier model explainer banner */}
      <AnimatePresence mode="wait">
        <motion.div key={tier}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-5 py-4 rounded-xl"
          style={{ background: isCloud ? 'rgba(26,129,175,0.07)' : 'rgba(118,185,0,0.07)', border: `1px solid ${isCloud ? '#1A81AF' : '#76B900'}30` }}
        >
          {isCloud
            ? <Cloud className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#1A81AF' }} />
            : <Server className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#76B900' }} />
          }
          <div>
            <div className="font-semibold text-sm" style={{ color: isCloud ? '#1A81AF' : '#76B900' }}>
              {isCloud ? '☁️ Cloud / API Billing — Direct Cost Savings' : '🖥️ Self-Hosted / On-Prem — Capacity & CapEx Model'}
            </div>
            <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {isCloud
                ? 'You pay per token. Every cache hit skips the system prompt tokens — that is a direct line-item reduction on your cloud invoice. The savings here are real, verifiable dollars.'
                : 'Your GPUs are already paid for — there is no per-token bill to reduce. The value comes from three sources: (1) the same hardware can serve far more users, (2) you avoid buying additional GPU servers as load grows (CapEx avoidance), and (3) GPUs consuming less power lowers your electricity bill (OpEx).'
              }
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Presets */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Industry Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p)}
              className="p-4 rounded-xl border text-left transition-all duration-200"
              style={{ borderColor: activePreset === p.id ? p.color : 'var(--border-subtle)', background: activePreset === p.id ? `${p.color}0d` : 'var(--surface-card)', boxShadow: activePreset === p.id ? `0 0 0 2px ${p.color}30` : 'none' }}>
              <div className="text-xl mb-1">{p.icon}</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.industry}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: `${p.color}18`, color: p.color }}>{fmtNum(p.systemTokens)} tokens</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>{fmtNum(p.dailyRequests)}/day</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT: Controls ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card-elevated p-6 space-y-6" style={{ borderLeft: `3px solid ${accent}` }}>
            <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: accent }}>Workload Parameters</h3>
            <Slider label="System Prompt Size" value={systemTokens} min={1000} max={500000} step={1000}
              onChange={setSystemTokens} format={v => `${fmtNum(v)} tokens`} color={accent}
              hint="Shared context per request — contract, manual, compliance script, clinical notes, etc." />
            <Slider label="Daily Requests" value={dailyRequests} min={1000} max={5000000} step={1000}
              onChange={setDailyRequests} format={v => `${fmtNum(v)}/day`} color={accent}
              hint="Total queries across all users per day." />
            <Slider label="Avg New Tokens Per Query" value={avgNewTokens} min={50} max={2000} step={50}
              onChange={setAvgNewTokens} format={v => `${v} tokens`} color={accent}
              hint="The user's actual question length. Only these tokens are processed on a cache hit." />
            <Slider label="Cache Hit Rate" value={hitRate} min={10} max={99} step={1}
              onChange={setHitRate} format={v => `${v}%`} color={accent}
              hint="% of requests that reuse the same system prompt. Shared templates = higher hit rate." />
          </div>

          {/* Tier picker */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Infrastructure / Billing Model</h3>
            <div className="space-y-2">
              {Object.entries(TIERS).map(([key, t]) => (
                <button key={key} onClick={() => setTier(key)}
                  className="w-full p-3 rounded-xl border text-left transition-all"
                  style={{ borderColor: tier === key ? t.color : 'var(--border-subtle)', background: tier === key ? `${t.color}0d` : 'var(--surface-card)' }}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.label}</div>
                    {tier === key && <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />}
                  </div>
                  <div className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── CLOUD Results ── */}
          {isCloud && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-elevated p-6" style={{ borderTop: `3px solid ${TIERS[tier].color}` }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <DollarSign className="w-5 h-5" style={{ color: TIERS[tier].color }} />
                  Direct Invoice Savings
                </h3>
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: `${TIERS[tier].color}18`, color: TIERS[tier].color }}>{TIERS[tier].label}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <KpiCard value={fmt$(roi.dailySavingsCloud)} label="Daily Savings" sublabel={`${fmtNum(roi.dailyHits)} cache hits/day`} color={TIERS[tier].color} />
                <KpiCard value={fmt$(roi.monthlySavingsCloud)} label="Monthly Savings" sublabel="Direct invoice reduction" color={TIERS[tier].color} />
                <KpiCard value={fmt$(roi.annualSavingsCloud)} label="Annual Savings" sublabel="Verifiable cost avoidance" color={TIERS[tier].color} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard value={roi.costReductionPct.toFixed(1)} label="Cost Reduction" sublabel="% of token bill eliminated" color="#00C280" suffix="%" />
                <KpiCard value={`${roi.throughputMultiplier.toFixed(0)}×`} label="Throughput Multiplier" sublabel="Same requests, less compute" color="#1A81AF" />
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(26,129,175,0.06)', border: '1px solid rgba(26,129,175,0.15)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#1A81AF]" />
                <span style={{ color: 'var(--text-muted)' }}>
                  Formula: <code className="font-mono">{fmtNum(systemTokens)} skipped tokens × ${TIERS[tier].costPer1kTokens.toFixed(4)}/1K × {fmtNum(roi.dailyHits)} hits/day × 365</code>
                  &nbsp;= <strong style={{ color: TIERS[tier].color }}>{fmt$(roi.annualSavingsCloud)}/yr</strong>
                </span>
              </div>
            </motion.div>
          )}

          {/* ── SELF-HOSTED Results ── */}
          {!isCloud && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-elevated p-6" style={{ borderTop: '3px solid #76B900' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Server className="w-5 h-5 text-[#76B900]" />
                  Self-Hosted Value: 3 Sources
                </h3>
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: '#76B90018', color: '#76B900' }}>On-Prem / Data Center</span>
              </div>

              {/* No direct savings callout */}
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl mb-5 text-xs" style={{ background: 'rgba(237,39,56,0.06)', border: '1px solid rgba(237,39,56,0.15)' }}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#ED2738]" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>Important:</strong> Your GPU is already paid for — there is no per-token bill.
                  The value here is <strong>capacity unlocked, CapEx you don't spend, and electricity saved</strong>.
                </span>
              </div>

              {/* Source 1 — Throughput */}
              <div className="rounded-2xl p-4 mb-3" style={{ background: '#76B90010', border: '1px solid #76B90025' }}>
                <div className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#76B900' }}>
                  <Zap className="w-4 h-4" /> Source 1: Throughput Multiplier (same GPU, more users)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard value={`${roi.throughputMultiplier.toFixed(0)}×`} label="More Requests, Same HW" sublabel={`${fmtNum(systemTokens)} tokens skipped per hit`} color="#76B900" />
                  <KpiCard value={`${roi.gpuUtilFreedPct.toFixed(1)}`} label="GPU Compute Freed" sublabel="Available for net-new workloads" color="#76B900" suffix="%" />
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Each cache hit skips {fmtNum(systemTokens)} prefill tokens. Your existing GPUs process only the {avgNewTokens}-token question.
                  This means <strong style={{ color: '#76B900' }}>{roi.throughputMultiplier.toFixed(0)}× more users</strong> can be served before you need to buy more hardware.
                </p>
              </div>

              {/* Source 2 — CapEx Avoidance */}
              <div className="rounded-2xl p-4 mb-3" style={{ background: '#1A81AF10', border: '1px solid #1A81AF25' }}>
                <div className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#1A81AF' }}>
                  <TrendingUp className="w-4 h-4" /> Source 2: CapEx Avoidance (GPU servers not purchased)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard value={`${roi.serversAvoided}`} label="DGX Servers Avoided" sublabel="At next capacity expansion" color="#1A81AF" />
                  <KpiCard value={fmt$(roi.capexAvoidance)} label="CapEx Avoided" sublabel="@$300K/DGX server" color="#1A81AF" />
                  <KpiCard value={fmt$(roi.annualCapexAmortised)} label="Annual Equivalent" sublabel="Over 3-yr server lifecycle" color="#1A81AF" />
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Without caching, serving {fmtNum(dailyRequests)} requests/day requires ~{roi.serversNeededWithout ?? '?'} DGX servers.
                  With DDN Infinia handling the prefix for {hitRate}% of requests, you need ~{roi.serversNeededWith ?? '?'} — avoiding ${fmt$(roi.capexAvoidance)} in hardware spend.
                </p>
              </div>

              {/* Source 3 — Power */}
              <div className="rounded-2xl p-4" style={{ background: '#f59e0b10', border: '1px solid #f59e0b25' }}>
                <div className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#f59e0b' }}>
                  ⚡ Source 3: Power / Electricity Savings (OpEx)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard value={`${(roi.gpuHoursSavedAnnually / 1000).toFixed(1)}K`} label="GPU-Hours Freed/Year" sublabel="Prefill compute eliminated" color="#f59e0b" />
                  <KpiCard value={`${(roi.powerSavedKWhAnnually / 1000).toFixed(1)}K`} label="kWh Saved/Year" sublabel="At 6.4kW per DGX server" color="#f59e0b" />
                  <KpiCard value={fmt$(roi.powerSavedUsdAnnually)} label="Power Cost Saved/Year" sublabel="@$0.10/kWh data center rate" color="#f59e0b" />
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #76B90015, #1A81AF10)', border: '2px solid #76B90030' }}>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Combined Annual Value</div>
                    <div className="font-mono font-black" style={{ color: '#76B900', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>{fmt$(roi.totalSelfHostedAnnual)}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>CapEx (amortised) + Power savings</div>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span>CapEx avoidance (÷ 3yr)</span>
                      <span className="font-mono font-semibold" style={{ color: '#1A81AF' }}>{fmt$(roi.annualCapexAmortised)}/yr</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Power savings</span>
                      <span className="font-mono font-semibold" style={{ color: '#f59e0b' }}>{fmt$(roi.powerSavedUsdAnnually)}/yr</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* GPU hours — shared, always visible */}
          <div className="card p-5">
            <button onClick={() => setShowBreakdown(!showBreakdown)} className="w-full flex items-center justify-between text-left">
              <span className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Zap className="w-4 h-4" style={{ color: accent }} />
                GPU Compute Breakdown
              </span>
              {showBreakdown ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
            </button>
            <AnimatePresence>
              {showBreakdown && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-red-500 flex items-center gap-1">❌ Without Cache — all tokens every request</span>
                        <span className="font-mono">{fmtNum(systemTokens + avgNewTokens)} tokens/req</span>
                      </div>
                      <div className="h-5 rounded-full overflow-hidden bg-neutral-100">
                        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #ED2738, #ff6b7a)', width: '100%' }} initial={{ width: 0 }} animate={{ width: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: '#00C280' }}>
                        <span className="flex items-center gap-1">✅ With DDN Infinia — only new tokens on hit</span>
                        <span className="font-mono">{avgNewTokens} tokens/req</span>
                      </div>
                      <div className="h-5 rounded-full overflow-hidden bg-neutral-100">
                        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00C280, #4deba0)', width: `${(avgNewTokens / (systemTokens + avgNewTokens)) * 100}%` }} initial={{ width: 0 }} animate={{ width: `${(avgNewTokens / (systemTokens + avgNewTokens)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                      {[
                        { label: 'Tokens skipped per hit', value: `${fmtNum(systemTokens)} tokens`, c: '#00C280' },
                        { label: 'GPU seconds saved per hit', value: `${(systemTokens / 3000).toFixed(2)}s`, c: '#76B900' },
                        { label: 'Cache hits per day', value: fmtNum(roi.dailyHits), c: accent },
                        { label: 'GPU hours freed per day', value: `${roi.gpuHoursSavedPerDay.toFixed(1)} hrs`, c: '#1A81AF' },
                        { label: 'GPU hours freed per year', value: `${roi.gpuHoursSavedAnnually.toFixed(0)} hrs`, c: '#1A81AF' },
                      ].map((row, i) => (
                        <div key={row.label} className="flex justify-between px-4 py-2.5 text-sm" style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-primary)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                          <span className="font-mono font-semibold" style={{ color: row.c }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scaling insight */}
          <motion.div className="p-5 rounded-2xl" style={{ background: `linear-gradient(135deg, ${accent}12, ${accent}05)`, border: `1px solid ${accent}25` }} layout>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: accent }} />
              <div>
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  {isCloud ? 'Why the invoice number is so large' : 'The right conversation to have with the CFO'}
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {isCloud
                    ? <>With a <strong>{fmtNum(systemTokens)}-token</strong> system prompt, every single cache hit eliminates <strong style={{ color: accent }}>${(systemTokens * TIERS[tier].costPer1kTokens / 1000).toFixed(4)}</strong> from your bill. At <strong>{fmtNum(roi.dailyHits)}</strong> hits/day that compounds to <strong style={{ color: accent }}>{fmt$(roi.annualSavingsCloud)}/year</strong> — a real line item you can verify on your next invoice.</>
                    : <><strong>Don't say "we save you $X/year on GPU costs"</strong> — that's wrong for owned hardware. Instead say: "With the same {fmtNum(dailyRequests / 1000)}K-request-per-day workload, DDN Infinia lets your existing GPUs handle <strong style={{ color: accent }}>{roi.throughputMultiplier.toFixed(0)}× the load</strong>. When you're ready to scale, you buy <strong style={{ color: accent }}>{roi.serversAvoided} fewer DGX servers</strong> — that's <strong style={{ color: accent }}>{fmt$(roi.capexAvoidance)}</strong> in CapEx you keep in the budget." That's a CFO-level conversation.</>
                  }
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
