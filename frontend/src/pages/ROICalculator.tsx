import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, TrendingUp, DollarSign, Zap, Clock, Users, ChevronDown, ChevronUp, Info } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Preset {
  id: string
  icon: string
  label: string
  industry: string
  systemTokens: number
  dailyRequests: number
  avgNewTokens: number
  hitRate: number
  tier: 'self_hosted_h100' | 'azure_a100' | 'openai_gpt4'
  color: string
}

interface TierConfig {
  label: string
  costPer1kTokens: number
  gpuCostPerHour: number
  color: string
}

// ─── Pricing Tiers ──────────────────────────────────────────────────────────
const TIERS: Record<string, TierConfig> = {
  self_hosted_h100: {
    label: 'Self-Hosted H100',
    costPer1kTokens: 0.0008,
    gpuCostPerHour: 2.80,
    color: '#76B900',
  },
  azure_a100: {
    label: 'Azure / AWS A100',
    costPer1kTokens: 0.0020,
    gpuCostPerHour: 3.40,
    color: '#1A81AF',
  },
  openai_gpt4: {
    label: 'OpenAI GPT-4o API',
    costPer1kTokens: 0.0050,
    gpuCostPerHour: 0,
    color: '#ED2738',
  },
}

// ─── Industry Presets ────────────────────────────────────────────────────────
const PRESETS: Preset[] = [
  {
    id: 'contact_center',
    icon: '📞',
    label: 'Contact Center AI',
    industry: 'Telecom / BPO',
    systemTokens: 50000,
    dailyRequests: 500000,
    avgNewTokens: 200,
    hitRate: 85,
    tier: 'self_hosted_h100',
    color: '#ED2738',
  },
  {
    id: 'legal_ai',
    icon: '⚖️',
    label: 'Legal Document AI',
    industry: 'Law Firm / LegalTech',
    systemTokens: 120000,
    dailyRequests: 50000,
    avgNewTokens: 500,
    hitRate: 70,
    tier: 'azure_a100',
    color: '#1A81AF',
  },
  {
    id: 'healthcare',
    icon: '🏥',
    label: 'Clinical Decision AI',
    industry: 'Hospital / Health System',
    systemTokens: 80000,
    dailyRequests: 100000,
    avgNewTokens: 300,
    hitRate: 75,
    tier: 'azure_a100',
    color: '#00C280',
  },
  {
    id: 'fintech',
    icon: '🏦',
    label: 'Financial Analyst AI',
    industry: 'Investment Bank / FinTech',
    systemTokens: 200000,
    dailyRequests: 25000,
    avgNewTokens: 800,
    hitRate: 60,
    tier: 'self_hosted_h100',
    color: '#f59e0b',
  },
  {
    id: 'ecommerce',
    icon: '🛒',
    label: 'Retail / E-commerce AI',
    industry: 'Retail / Marketplace',
    systemTokens: 30000,
    dailyRequests: 2000000,
    avgNewTokens: 100,
    hitRate: 90,
    tier: 'openai_gpt4',
    color: '#8b5cf6',
  },
  {
    id: 'custom',
    icon: '⚙️',
    label: 'Custom Scenario',
    industry: 'Your Organization',
    systemTokens: 10000,
    dailyRequests: 100000,
    avgNewTokens: 250,
    hitRate: 70,
    tier: 'self_hosted_h100',
    color: '#6b7280',
  },
]

// ─── Math Engine ─────────────────────────────────────────────────────────────
function computeROI(params: {
  systemTokens: number
  dailyRequests: number
  avgNewTokens: number
  hitRate: number
  tier: string
}) {
  const { systemTokens, dailyRequests, avgNewTokens, hitRate, tier } = params
  const tierConfig = TIERS[tier]
  const hitFraction = hitRate / 100

  // Tokens processed per request
  const tokensWithoutCache = systemTokens + avgNewTokens  // must process everything
  const tokensWithCache    = avgNewTokens                  // only new question tokens

  // Cost per request
  const costWithoutCache = (tokensWithoutCache / 1000) * tierConfig.costPer1kTokens
  const costWithCache    = (tokensWithCache    / 1000) * tierConfig.costPer1kTokens

  // Savings per cache-hit request
  const savingsPerHit = costWithoutCache - costWithCache

  // Daily mix: hitFraction of requests are hits
  const dailyHits   = dailyRequests * hitFraction
  const dailyMisses = dailyRequests * (1 - hitFraction)

  // Daily costs
  const dailyCostNoCache  = dailyRequests * costWithoutCache
  const dailyCostWithCache = (dailyHits * costWithCache) + (dailyMisses * costWithoutCache)
  const dailySavings       = dailyCostNoCache - dailyCostWithCache

  // Scaled
  const monthlySavings = dailySavings * 30
  const annualSavings  = dailySavings * 365

  // GPU hours saved per month (time ∝ tokens)
  const tokensSavedPerHit      = systemTokens               // these are NOT processed
  const totalTokensSavedMonthly = tokensSavedPerHit * dailyHits * 30
  // H100 processes ~1M tokens/second = 3.6B tokens/hour
  const gpuHoursSavedMonthly = totalTokensSavedMonthly / 3_600_000_000

  // ROI multiplier: $ saved vs cost of DDN Infinia (estimated at $0.023/GB/month S3 storage)
  // Rough: each cache entry is ~avgNewTokens * 4 bytes ≈ small; negligible vs savings
  const infiniaCostMonthly = (dailyHits * 30 * avgNewTokens * 4) / (1024 ** 3) * 0.023
  const roiMultiplier = infiniaCostMonthly > 0 ? monthlySavings / infiniaCostMonthly : 999

  return {
    savingsPerHit,
    costWithoutCache,
    costWithCache,
    dailyCostNoCache,
    dailyCostWithCache,
    dailySavings,
    dailyHits: Math.round(dailyHits),
    dailyMisses: Math.round(dailyMisses),
    monthlySavings,
    annualSavings,
    gpuHoursSavedMonthly,
    infiniaCostMonthly,
    roiMultiplier: Math.min(roiMultiplier, 9999),
    costReductionPct: (dailySavings / dailyCostNoCache) * 100,
    totalTokensSavedMonthly,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

// ─── Slider ──────────────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, onChange, format, hint, color = '#ED2738' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string; hint?: string; color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>
        <span className="font-mono font-bold text-base px-3 py-0.5 rounded-lg" style={{ background: `${color}18`, color }}>{format(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${pct}%, var(--surface-secondary) ${pct}%)`,
            accentColor: color,
          }}
        />
      </div>
      {hint && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

// ─── Animated big number ─────────────────────────────────────────────────────
function BigNumber({ value, label, sublabel, color = '#00C280', prefix = '', suffix = '' }: {
  value: string; label: string; sublabel?: string; color?: string; prefix?: string; suffix?: string
}) {
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center p-4 rounded-2xl"
      style={{ background: `${color}0f`, border: `1px solid ${color}25` }}
    >
      <div className="font-mono font-black leading-none mb-1" style={{ color, fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
        {prefix}{value}{suffix}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: `${color}cc` }}>{label}</div>
      {sublabel && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sublabel}</div>}
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ROICalculator() {
  const [activePreset, setActivePreset] = useState<string>('contact_center')
  const initial = PRESETS.find(p => p.id === 'contact_center')!

  const [systemTokens, setSystemTokens]     = useState(initial.systemTokens)
  const [dailyRequests, setDailyRequests]   = useState(initial.dailyRequests)
  const [avgNewTokens, setAvgNewTokens]     = useState(initial.avgNewTokens)
  const [hitRate, setHitRate]               = useState(initial.hitRate)
  const [tier, setTier]                     = useState<string>(initial.tier)
  const [showBreakdown, setShowBreakdown]   = useState(false)

  const roi = useMemo(() => computeROI({ systemTokens, dailyRequests, avgNewTokens, hitRate, tier }), [
    systemTokens, dailyRequests, avgNewTokens, hitRate, tier,
  ])

  const applyPreset = (p: Preset) => {
    setActivePreset(p.id)
    setSystemTokens(p.systemTokens)
    setDailyRequests(p.dailyRequests)
    setAvgNewTokens(p.avgNewTokens)
    setHitRate(p.hitRate)
    setTier(p.tier)
  }

  const accentColor = PRESETS.find(p => p.id === activePreset)?.color ?? '#ED2738'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="section-header">
        <h2 className="section-title flex items-center gap-2">
          <Calculator className="w-6 h-6" style={{ color: 'var(--ddn-red)' }} />
          Enterprise ROI Calculator
        </h2>
        <p className="section-description">
          Plug in your organization's real workload parameters and see exactly how much DDN Infinia saves at enterprise scale.
          All calculations are based on the same cost model used in the live demo.
        </p>
      </div>

      {/* Industry Preset Selector */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
          Start with an Industry Preset — or tune the sliders manually
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="p-4 rounded-xl border text-left transition-all duration-200"
              style={{
                borderColor: activePreset === p.id ? p.color : 'var(--border-subtle)',
                background: activePreset === p.id ? `${p.color}0d` : 'var(--surface-card)',
                boxShadow: activePreset === p.id ? `0 0 0 2px ${p.color}30` : 'none',
              }}
            >
              <div className="text-xl mb-1">{p.icon}</div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.industry}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: `${p.color}18`, color: p.color }}>
                  {fmtNum(p.systemTokens)} sys tokens
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
                  {fmtNum(p.dailyRequests)}/day
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left — Controls */}
        <div className="lg:col-span-2 space-y-5">

          {/* Sliders */}
          <div className="card-elevated p-6 space-y-6" style={{ borderLeft: `3px solid ${accentColor}` }}>
            <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: accentColor }}>
              Workload Parameters
            </h3>

            <Slider
              label="System Prompt Size"
              value={systemTokens}
              min={1000} max={500000} step={1000}
              onChange={setSystemTokens}
              format={v => `${fmtNum(v)} tokens`}
              hint="The shared context loaded before every request — contract, manual, compliance script, etc."
              color={accentColor}
            />
            <Slider
              label="Daily Requests"
              value={dailyRequests}
              min={1000} max={5000000} step={1000}
              onChange={setDailyRequests}
              format={v => `${fmtNum(v)}/day`}
              hint="Total queries your AI system handles per day across all users."
              color={accentColor}
            />
            <Slider
              label="Avg New Tokens Per Query"
              value={avgNewTokens}
              min={50} max={2000} step={50}
              onChange={setAvgNewTokens}
              format={v => `${v} tokens`}
              hint="The actual question/user message length. DDN only processes these on a cache hit."
              color={accentColor}
            />
            <Slider
              label="Cache Hit Rate"
              value={hitRate}
              min={10} max={99} step={1}
              onChange={setHitRate}
              format={v => `${v}%`}
              hint="% of requests that share the same system prompt prefix. Repeated queries, templates, or shared context = higher hit rate."
              color={accentColor}
            />
          </div>

          {/* Tier Selector */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Infrastructure / Pricing Tier
            </h3>
            <div className="space-y-2">
              {Object.entries(TIERS).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setTier(key)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all"
                  style={{
                    borderColor: tier === key ? t.color : 'var(--border-subtle)',
                    background: tier === key ? `${t.color}0d` : 'var(--surface-card)',
                  }}
                >
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>${t.costPer1kTokens.toFixed(4)} per 1K tokens</div>
                  </div>
                  {tier === key && <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div className="lg:col-span-3 space-y-5">

          {/* Hero numbers */}
          <motion.div
            className="card-elevated p-6"
            style={{ borderTop: `3px solid ${accentColor}` }}
            layout
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: accentColor }} />
                Projected Savings with DDN Infinia
              </h3>
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: `${accentColor}18`, color: accentColor }}>
                {TIERS[tier].label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <BigNumber
                value={fmt$(roi.dailySavings)}
                label="Daily Savings"
                sublabel={`${fmtNum(roi.dailyHits)} cache hits/day`}
                color={accentColor}
              />
              <BigNumber
                value={fmt$(roi.monthlySavings)}
                label="Monthly Savings"
                sublabel="30-day projection"
                color={accentColor}
              />
              <BigNumber
                value={fmt$(roi.annualSavings)}
                label="Annual Savings"
                sublabel="365-day projection"
                color={accentColor}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <BigNumber
                value={roi.costReductionPct.toFixed(1)}
                label="Cost Reduction"
                suffix="%"
                color="#00C280"
              />
              <BigNumber
                value={roi.gpuHoursSavedMonthly >= 1 ? roi.gpuHoursSavedMonthly.toFixed(0) : roi.gpuHoursSavedMonthly.toFixed(2)}
                label="GPU Hours Saved/Month"
                sublabel="Prefill compute eliminated"
                color="#1A81AF"
                suffix=" hrs"
              />
              <BigNumber
                value={roi.roiMultiplier >= 1000 ? '>1000' : roi.roiMultiplier.toFixed(0)}
                label="ROI vs Storage Cost"
                sublabel="$ saved per $ spent on Infinia"
                color="#8b5cf6"
                suffix="x"
              />
            </div>
          </motion.div>

          {/* Per-request breakdown */}
          <div className="card p-5">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <DollarSign className="w-4 h-4" style={{ color: accentColor }} />
                Per-Request Cost Breakdown
              </span>
              {showBreakdown ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
            </button>

            <AnimatePresence>
              {showBreakdown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4">
                    {/* Token comparison bars */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="flex items-center gap-1"><span className="text-red-500">❌</span> Without Cache</span>
                          <span className="font-mono text-neutral-600">{fmtNum(systemTokens + avgNewTokens)} tokens · ${roi.costWithoutCache.toFixed(6)}</span>
                        </div>
                        <div className="h-5 rounded-full overflow-hidden bg-neutral-100">
                          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #ED2738, #ff6b7a)', width: '100%' }} initial={{ width: 0 }} animate={{ width: '100%' }} />
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>System ({fmtNum(systemTokens)}) + Query ({avgNewTokens}) = {fmtNum(systemTokens + avgNewTokens)} tokens</div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="flex items-center gap-1" style={{ color: '#00C280' }}><span>✅</span> With DDN Infinia</span>
                          <span className="font-mono" style={{ color: '#00C280' }}>{avgNewTokens} tokens · ${roi.costWithCache.toFixed(6)}</span>
                        </div>
                        <div className="h-5 rounded-full overflow-hidden bg-neutral-100">
                          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00C280, #4deba0)', width: `${(avgNewTokens / (systemTokens + avgNewTokens)) * 100}%` }} initial={{ width: 0 }} animate={{ width: `${(avgNewTokens / (systemTokens + avgNewTokens)) * 100}%` }} />
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Only query tokens processed — system prefix loaded from Infinia in ~50ms</div>
                      </div>
                    </div>

                    {/* Summary table */}
                    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                      {[
                        { label: 'Tokens saved per cache hit', value: `${fmtNum(systemTokens)} tokens`, color: '#00C280' },
                        { label: 'Cost saved per cache hit', value: `$${roi.savingsPerHit.toFixed(6)}`, color: '#00C280' },
                        { label: 'Cache hits per day', value: fmtNum(roi.dailyHits), color: accentColor },
                        { label: 'Cache misses per day', value: fmtNum(roi.dailyMisses), color: 'var(--text-muted)' },
                        { label: 'Total tokens saved / month', value: `${(roi.totalTokensSavedMonthly / 1e9).toFixed(2)}B tokens`, color: '#1A81AF' },
                        { label: 'Est. Infinia storage cost / month', value: `$${roi.infiniaCostMonthly.toFixed(4)}`, color: 'var(--text-muted)' },
                      ].map((row, i) => (
                        <div key={row.label} className="flex justify-between items-center px-4 py-2.5 text-sm" style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-primary)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                          <span className="font-mono font-semibold" style={{ color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(26,129,175,0.06)', border: '1px solid rgba(26,129,175,0.15)', color: 'var(--text-muted)' }}>
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#1A81AF]" />
                      <span>
                        Formula: <code className="font-mono">savings_per_hit × daily_requests × hit_rate × 365</code>.
                        Cost model uses <strong>{fmtNum(systemTokens)}</strong> skipped tokens × ${TIERS[tier].costPer1kTokens}/1K = ${roi.savingsPerHit.toFixed(6)}/hit.
                        Infinia replaces GPU prefill (~{fmtNum(systemTokens)} tokens) with a ~50ms S3 GET.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comparison table — Current demo vs enterprise */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
              Current Demo vs This Enterprise Scenario
            </h3>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
              {[
                { metric: 'System Tokens', demo: '~400', enterprise: fmtNum(systemTokens), highlight: systemTokens > 1000 },
                { metric: 'Daily Requests', demo: '200,000', enterprise: `${fmtNum(dailyRequests)}/day`, highlight: dailyRequests > 200000 },
                { metric: 'Cache Hit Rate', demo: '~100% (demo)', enterprise: `${hitRate}%`, highlight: false },
                { metric: 'Annual Savings', demo: '~$28K', enterprise: fmt$(roi.annualSavings), highlight: true },
                { metric: 'GPU Hours Saved/Month', demo: '~480 hrs', enterprise: `${roi.gpuHoursSavedMonthly >= 1 ? roi.gpuHoursSavedMonthly.toFixed(0) : roi.gpuHoursSavedMonthly.toFixed(1)} hrs`, highlight: true },
              ].map((row, i) => (
                <div key={row.metric} className="grid grid-cols-3 items-center px-4 py-3 text-sm" style={{ background: i % 2 === 0 ? 'var(--surface-card)' : 'var(--surface-primary)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</span>
                  <span className="font-mono text-center text-xs" style={{ color: 'var(--text-muted)' }}>{row.demo}</span>
                  <span className="font-mono font-bold text-right" style={{ color: row.highlight ? accentColor : 'var(--text-primary)' }}>{row.enterprise}</span>
                </div>
              ))}
              <div className="px-4 py-2 flex justify-between text-xs" style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
                <span>Metric</span>
                <div className="flex gap-16">
                  <span>Demo (today)</span>
                  <span style={{ color: accentColor, fontWeight: 700 }}>Enterprise scenario</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scaling insight */}
          <motion.div
            className="p-5 rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}05)`, border: `1px solid ${accentColor}25` }}
            layout
          >
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
              <div>
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  Why the numbers are so much larger than the live demo
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  The live demo uses a <strong>{fmtNum(400)}-token</strong> system prompt. Real enterprise workloads use{' '}
                  <strong>{fmtNum(systemTokens)}-token</strong> prefixes — that's{' '}
                  <strong style={{ color: accentColor }}>{(systemTokens / 400).toFixed(0)}× larger</strong> — so every cache hit
                  skips proportionally more GPU compute. Multiply that by{' '}
                  <strong>{fmtNum(dailyRequests)}</strong> daily requests at a{' '}
                  <strong>{hitRate}% hit rate</strong> and the compounding effect produces{' '}
                  <strong style={{ color: accentColor }}>{fmt$(roi.annualSavings)}/year</strong> in avoided GPU cost.
                  DDN Infinia stores the prefix once — every subsequent request reads it in ~50ms instead of recomputing for seconds.
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
