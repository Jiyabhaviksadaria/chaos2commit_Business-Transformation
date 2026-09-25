"use client"

import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Globe2,
  Info,
  Lightbulb,
  MapPin,
  MessageCircle,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

function toneClasses(tone: "positive" | "attention" | "neutral" | "critical" = "neutral") {
  if (tone === "positive") return "text-emerald-700 bg-emerald-50 border-emerald-100"
  if (tone === "attention") return "text-amber-700 bg-amber-50 border-amber-100"
  if (tone === "critical") return "text-red-700 bg-red-50 border-red-100"
  return "text-neutral-700 bg-[#FAF8F2] border-[#E5DFD4]"
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-400">{eyebrow}</p><h2 className="text-lg font-extrabold tracking-tight text-neutral-900 mt-1">{title}</h2>{description && <p className="text-xs text-neutral-500 mt-1 max-w-3xl leading-relaxed">{description}</p>}</div>{action}</div>
}

function MetricCard({ label, value, detail, icon: Icon, trend, tone = "neutral", labels }: { label: string; value: React.ReactNode; detail?: string; icon: LucideIcon; trend?: "up" | "down"; tone?: "positive" | "attention" | "neutral" | "critical"; labels: AnalysisLabels }) {
  return <div className="rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClasses(tone)}`}><Icon className="h-4 w-4" /></div>{trend && <span className={`flex items-center gap-1 text-[10px] font-extrabold ${trend === "up" ? "text-emerald-600" : "text-red-600"}`}>{trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {trend === "up" ? labels.improving : labels.watch}</span>}</div><p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">{value}</p>{detail && <p className="mt-1 text-[11px] text-neutral-500">{detail}</p>}</div>
}

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const duration = 650
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{prefix}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(display)}{suffix}</>
}

function ScoreRing({ score, label, size = "large" }: { score: number; label?: string; size?: "large" | "small" }) {
  const degrees = Math.max(0, Math.min(100, score)) * 3.6
  return <div className={`relative flex shrink-0 items-center justify-center rounded-full ${size === "large" ? "h-36 w-36" : "h-16 w-16"}`} style={{ background: `conic-gradient(#18181C ${degrees}deg, #E5DFD4 ${degrees}deg 360deg)` }}><div className={`${size === "large" ? "h-28 w-28" : "h-14 w-14"} flex flex-col items-center justify-center rounded-full bg-white`}><span className={`${size === "large" ? "text-2xl" : "text-xs"} font-extrabold text-neutral-900`}>{score}/100</span>{label && <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">{label}</span>}</div></div>
}

function TrendLineChart({ data, accessor, color, suffix = "", prefix = "" }: { data: readonly DemoFinancialYear[]; accessor: (item: DemoFinancialYear) => number; color: string; suffix?: string; prefix?: string }) {
  const values = data.map(accessor)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(1, max - min)
  const points = values.map((value, index) => {
    const x = 42 + index * 150
    const y = 178 - ((value - min) / range) * 130
    return { x, y, value }
  })
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ")
  return <div className="relative h-56 w-full"><svg viewBox="0 0 420 220" className="h-full w-full overflow-visible" role="img" aria-label="Illustrative trend chart"><line x1="28" y1="178" x2="400" y2="178" stroke="#E5DFD4" /><line x1="28" y1="120" x2="400" y2="120" stroke="#E5DFD4" strokeDasharray="4 5" /><line x1="28" y1="62" x2="400" y2="62" stroke="#E5DFD4" strokeDasharray="4 5" /><polyline points={pointString} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-700" />{points.map((point, index) => <g key={data[index].year}><circle cx={point.x} cy={point.y} r="5" fill="white" stroke={color} strokeWidth="3" /><text x={point.x} y="202" textAnchor="middle" className="fill-neutral-500 text-[10px] font-bold">{data[index].year}</text><text x={point.x} y={point.y - 13} textAnchor="middle" className="fill-neutral-800 text-[9px] font-extrabold">{prefix}{point.value}{suffix}</text></g>)}</svg></div>
}

function MiniGrowthChart({ values, labels }: { values: number[]; labels: AnalysisLabels }) {
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${24 + index * 68},${82 - (value / max) * 54}`).join(" ")
  return <div className="mt-4 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.marketGrowthTrajectory}</span><span className="text-[10px] font-bold text-emerald-700">{labels.illustrativeCagr}</span></div><svg viewBox="0 0 230 100" className="mt-2 h-24 w-full" role="img" aria-label={labels.marketGrowthTrajectory}><polyline points={points} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{values.map((value, index) => <circle key={index} cx={24 + index * 68} cy={82 - (value / max) * 54} r="4" fill="white" stroke="#10B981" strokeWidth="2"><title>{`${value}%`}</title></circle>)}</svg></div>
}

function BarRow({ label, value, max, color = "#18181C", prefix = "", suffix = "" }: { label: string; value: number; max: number; color?: string; prefix?: string; suffix?: string }) {
  return <div className="space-y-1.5" title={`${label}: ${prefix}${value}${suffix}`}><div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-neutral-700">{label}</span><span className="font-extrabold text-neutral-900">{prefix}{value}{suffix}</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} /></div></div>
}

function Donut({ center, subtext, segments }: { center: string; subtext: string; segments: readonly DemoCustomerSegment[] }) {
  let cursor = 0
  const stops = segments.map((segment) => { const from = cursor; cursor += segment.revenueContribution; return `${segment.color} ${from}% ${cursor}%` }).join(", ")
  return <div className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${stops})` }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white"><span className="text-xl font-extrabold text-neutral-900">{center}</span><span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">{subtext}</span></div><span className="absolute -right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#18181C] px-2 py-1 text-[9px] font-bold text-white">{center}</span></div>
}

const radarAxes = [
  { key: "product", label: "Product" },
  { key: "ai", label: "AI" },
  { key: "pricing", label: "Pricing" },
  { key: "analytics", label: "Analytics" },
  { key: "enterprise", label: "Enterprise" },
  { key: "experience", label: "Experience" },
  { key: "scalability", label: "Scale" },
] as const

function RadarChart({ competitors, labels }: { competitors: readonly DemoCompetitor[]; labels: AnalysisLabels }) {
  const center = 150
  const radius = 92
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / radarAxes.length
    const distance = radius * (value / 100)
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`
  }
  return <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center"><svg viewBox="0 0 300 300" className="h-72 w-72 max-w-full" role="img" aria-label={labels.radarAriaLabel}>{[1, 0.75, 0.5, 0.25].map((scale) => <polygon key={scale} points={radarAxes.map((_, index) => point(index, 100 * scale)).join(" ")} fill="none" stroke="#E5DFD4" strokeWidth="1" />)}{radarAxes.map((axis, index) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / radarAxes.length; const x = center + Math.cos(angle) * (radius + 27); const y = center + Math.sin(angle) * (radius + 27); return <text key={axis.key} x={x} y={y} textAnchor="middle" className="fill-neutral-500 text-[9px] font-bold">{axis.label}</text> })}{competitors.map((competitor, competitorIndex) => <polygon key={competitor.name} points={radarAxes.map((axis, index) => point(index, competitor.scores[axis.key])).join(" ")} fill={competitor.color} fillOpacity={competitorIndex === 0 ? 0.18 : 0.06} stroke={competitor.color} strokeWidth={competitorIndex === 0 ? 3 : 1.5} className="transition-all duration-700"><title>{competitor.name}</title></polygon>)}</svg><div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[11px]">{competitors.map((competitor) => <div key={competitor.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: competitor.color }} /><span className="font-semibold text-neutral-700">{competitor.name}</span></div>)}</div></div>
}

function ScenarioControl({ label, options, value, onChange, prefix = "" }: { label: string; options: readonly number[]; value: number; onChange: (value: number) => void; prefix?: string }) {
  return <div className="space-y-2"><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{label}</p><div className="flex flex-wrap gap-2">{options.map((option) => <button type="button" key={option} onClick={() => onChange(option)} className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${value === option ? "border-[#18181C] bg-[#18181C] text-white shadow-sm" : "border-[#E5DFD4] bg-white text-neutral-600 hover:border-neutral-400"}`}>{prefix}{option}%</button>)}</div></div>
}

function InsightCard({ insight, expanded, onToggle, labels }: { insight: DemoInsight; expanded: boolean; onToggle: () => void; labels: AnalysisLabels }) {
  return <div className={`rounded-2xl border p-4 transition-all duration-300 ${expanded ? "border-neutral-400 bg-[#FAF8F2] shadow-sm" : "border-[#E5DFD4] bg-white hover:border-neutral-300"}`}><button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-extrabold text-neutral-900">{insight.title}</span><Badge className="border-none bg-[#FEE895] text-[10px] text-neutral-900">{insight.priority}</Badge></div><p className={`mt-2 text-xs leading-relaxed text-neutral-600 ${expanded ? "" : "line-clamp-2"}`}>{insight.body}</p></div><ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>{expanded && <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#E5DFD4] pt-3 text-[11px] sm:grid-cols-3"><div><span className="font-bold text-neutral-500">{labels.impact}</span><p className="mt-1 font-extrabold text-neutral-900">{insight.impact}</p></div><div><span className="font-bold text-neutral-500">{labels.confidence}</span><p className="mt-1 font-extrabold text-neutral-900">{insight.confidence}</p></div><div><span className="font-bold text-neutral-500">{labels.recommendedAction}</span><p className="mt-1 font-semibold text-neutral-700">{insight.action}</p></div></div>}</div>
}

function RecommendationCard({ recommendation, labels }: { recommendation: DemoRecommendation; labels: AnalysisLabels }) {
  return <div className="rounded-2xl border border-[#E5DFD4] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-neutral-900">{recommendation.title}</p><p className="mt-1 text-xs text-neutral-500">{recommendation.outcome}</p></div><Badge className="border-none bg-[#18181C] text-[10px] text-white">{recommendation.priority}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-[#FAF8F2] p-2"><span className="text-neutral-500">{labels.impact}</span><p className="mt-1 font-extrabold text-neutral-900">{recommendation.impact}</p></div><div className="rounded-xl bg-[#FAF8F2] p-2"><span className="text-neutral-500">{labels.effort}</span><p className="mt-1 font-extrabold text-neutral-900">{recommendation.effort}</p></div></div></div>
}

function PriorityMatrix({ recommendations, selected, onSelect, labels }: { recommendations: readonly DemoRecommendation[]; selected: string | null; onSelect: (id: string) => void; labels: AnalysisLabels }) {
  const quadrants: ReadonlyArray<{ key: DemoRecommendation["quadrant"]; title: string; subtitle: string; tone: string }> = [
    { key: "high-low", title: labels.qHighLow, subtitle: labels.qHighLowSub, tone: "bg-emerald-50 border-emerald-100" },
    { key: "high-medium", title: labels.qHighMedium, subtitle: labels.qHighMediumSub, tone: "bg-[#FAF8F2] border-[#E5DFD4]" },
    { key: "medium-medium", title: labels.qMediumMedium, subtitle: labels.qMediumMediumSub, tone: "bg-[#FAF8F2] border-[#E5DFD4]" },
    { key: "medium-high", title: labels.qMediumHigh, subtitle: labels.qMediumHighSub, tone: "bg-amber-50 border-amber-100" },
  ]
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{quadrants.map((quadrant) => <div key={quadrant.key} className={`min-h-36 rounded-2xl border p-4 ${quadrant.tone}`}><p className="text-xs font-extrabold text-neutral-900">{quadrant.title}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{quadrant.subtitle}</p><div className="mt-4 flex flex-wrap gap-2">{recommendations.filter((recommendation) => recommendation.quadrant === quadrant.key).map((recommendation) => <button type="button" key={recommendation.id} onClick={() => onSelect(recommendation.id)} className={`rounded-full border px-3 py-2 text-[11px] font-bold transition-all ${selected === recommendation.id ? "border-[#18181C] bg-[#18181C] text-white" : "border-white bg-white/70 text-neutral-700 hover:border-neutral-400"}`}>{recommendation.title}</button>)}</div></div>)}</div>
}

export function DemoBusinessAnalysisDashboard({ onReset, dataset }: { onReset: () => void; dataset?: AnalysisDataset }) {
  const data = dataset ?? DEFAULT_DATASET
  const labels = data.labels
  const [expandedInsight, setExpandedInsight] = useState<string | null>(data.insights[0].id)
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)
  const [customerGrowth, setCustomerGrowth] = useState<number>(data.scenarios.defaults.customerGrowth)
  const [cacReduction, setCacReduction] = useState<number>(data.scenarios.defaults.cacReduction)
  const [retentionImprovement, setRetentionImprovement] = useState<number>(data.scenarios.defaults.retentionImprovement)
  const [selectedQuestion, setSelectedQuestion] = useState(data.qa[0].question)
  const [answer, setAnswer] = useState(data.qa[0].answer)
  const [questionInput, setQuestionInput] = useState("")
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    setIsCalculating(true)
    const timer = window.setTimeout(() => setIsCalculating(false), 260)
    return () => window.clearTimeout(timer)
  }, [customerGrowth, cacReduction, retentionImprovement])

  const scenario = useMemo(() => {
    const projectedRevenue = data.financials.years[2].revenue * (1 + customerGrowth / 100 + retentionImprovement / 100 * 0.18 + cacReduction / 100 * 0.12)
    const projectedCustomers = Math.round(data.customers.total * (1 + customerGrowth / 100 * 0.7 + retentionImprovement / 100 * 0.12))
    const projectedCac = data.financials.cac * (1 - cacReduction / 100)
    const projectedLtv = data.financials.ltv * (1 + retentionImprovement / 100 * 0.04 + cacReduction / 100 * 0.02)
    const estimatedProfit = projectedRevenue * (0.14 + retentionImprovement / 100 * 0.004 + cacReduction / 100 * 0.002)
    const growthRate = data.financials.years[2].revenueGrowth + customerGrowth * 0.32 + retentionImprovement * 0.65 - cacReduction * 0.18
    return { projectedRevenue, projectedCustomers, projectedCac, projectedLtv, estimatedProfit, growthRate }
  }, [cacReduction, customerGrowth, data, retentionImprovement])

  const askQuestion = (question: string) => {
    const normalized = question.trim()
    if (!normalized) return
    const match = data.qa.find((item) => item.question.toLowerCase() === normalized.toLowerCase())
    setSelectedQuestion(normalized)
    setAnswer(match?.answer || labels.qaFallback)
    setQuestionInput("")
  }

  const swotCards: Array<{ title: string; items: readonly string[]; tone: string; icon: LucideIcon }> = [
    { title: labels.strengths, items: data.swot.strengths, tone: "bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
    { title: labels.weaknesses, items: data.swot.weaknesses, tone: "bg-red-50 border-red-100", icon: ArrowDownRight },
    { title: labels.opportunities, items: data.swot.opportunities, tone: "bg-blue-50 border-blue-100", icon: TrendingUp },
    { title: labels.threats, items: data.swot.threats, tone: "bg-amber-50 border-amber-100", icon: ShieldCheck },
  ]

  return <div className="space-y-6">
    <div className="rounded-[26px] border border-[#18181C] bg-[#18181C] p-5 text-white shadow-xl shadow-neutral-200/50 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FEE895] text-neutral-900"><Sparkles className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><Badge className="border-none bg-[#FEE895] text-[10px] font-extrabold tracking-wider text-neutral-900">{labels.demoMode}</Badge><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">{data.status}</span></div><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{data.company.name}</h1><p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-300">{data.company.description}</p></div></div><div className="flex shrink-0 items-center gap-3"><Button onClick={onReset} variant="outline" className="border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/20 hover:text-white"><RefreshCw className="h-3.5 w-3.5" /> {labels.resetDemo}</Button></div></div><div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-neutral-300"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#FEE895]" />{data.company.headquarters}</span><span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#FEE895]" />{data.company.employees} {labels.employees}</span><span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-[#FEE895]" />{data.company.annualGrowth} {labels.annualGrowth}</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#FEE895]" />{labels.fictionalData}</span></div></div>

    <section><SectionHeading eyebrow={labels.eyebrowOverview} title={labels.titleOverallHealth} description={labels.descOverallHealth} action={<Badge className="border-none bg-emerald-100 text-emerald-800"><Activity className="mr-1 h-3 w-3" /> {labels.illustrativeDemoData}</Badge>} /><div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]"><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardContent className="flex flex-col items-center justify-center p-6 text-center"><ScoreRing score={data.health.overall} label={labels.scoreOverall} /><p className="mt-4 text-sm font-extrabold text-neutral-900">{labels.businessHealth}</p><p className="mt-1 text-[11px] text-neutral-500">{labels.illustrativeScoreOnly}</p></CardContent></Card><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.health.dimensions.map((dimension) => <div key={dimension.label} className="rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-sm transition-all hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-neutral-700">{dimension.label}</span><span className={`text-sm font-extrabold ${dimension.tone === "positive" ? "text-emerald-700" : "text-amber-700"}`}>{dimension.value}</span></div><Progress value={dimension.value} className="mt-3 h-2 bg-neutral-100" /><p className="mt-2 text-[10px] text-neutral-400">{dimension.tone === "positive" ? labels.strongSignal : labels.areaToValidate}</p></div>)}</div></div></section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]"><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.executiveSummary}</CardTitle><CardDescription className="text-xs">{labels.descExecutiveSummary}</CardDescription></CardHeader><CardContent><p className="text-sm leading-7 text-neutral-800">{data.executiveSummary}</p><div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3"><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">{labels.keyOpportunity}</p><p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-950">{data.executiveHighlights.opportunity}</p></div><div className="rounded-2xl border border-red-100 bg-red-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-red-700">{labels.keyRisk}</p><p className="mt-2 text-xs font-semibold leading-relaxed text-red-950">{data.executiveHighlights.risk}</p></div><div className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.recommendedPriority}</p><p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-800">{data.executiveHighlights.priority}</p></div></div></CardContent></Card><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.companyProfile}</CardTitle><CardDescription className="text-xs">{labels.descCompanyProfile}</CardDescription></CardHeader><CardContent className="space-y-3 text-xs"><div className="flex items-center justify-between border-b border-[#E5DFD4] pb-2"><span className="text-neutral-500">{labels.industry}</span><span className="font-extrabold text-neutral-900">{data.company.industry}</span></div><div className="flex items-center justify-between border-b border-[#E5DFD4] pb-2"><span className="text-neutral-500">{labels.founded}</span><span className="font-extrabold text-neutral-900">{data.company.founded}</span></div><div className="flex items-center justify-between border-b border-[#E5DFD4] pb-2"><span className="text-neutral-500">{labels.businessModel}</span><span className="font-extrabold text-neutral-900">{data.company.businessModel}</span></div><div className="flex items-center justify-between border-b border-[#E5DFD4] pb-2"><span className="text-neutral-500">{labels.annualRevenue}</span><span className="font-extrabold text-neutral-900">{data.company.annualRevenue}</span></div><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.marketAndWebsite}</p><div className="mt-2 space-y-1 text-xs font-semibold text-neutral-700"><p>{data.company.primaryMarket}</p><p className="text-neutral-500">{data.company.website}</p></div></div><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.targetCustomers}</p><div className="mt-2 flex flex-wrap gap-1.5">{data.company.targetCustomers.map((customer) => <Badge key={customer} variant="outline" className="border-[#E5DFD4] text-[10px]">{customer}</Badge>)}</div></div><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.primaryProducts}</p><div className="mt-2 flex flex-wrap gap-1.5">{data.company.primaryProducts.map((product) => <Badge key={product} variant="outline" className="border-[#E5DFD4] text-[10px]">{product}</Badge>)}</div></div></CardContent></Card></section>

    <section><SectionHeading eyebrow={labels.eyebrowFinancial} title={labels.financialPerformance} description={labels.descFinancialPerformance} /><div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><Card className="border-[#E5DFD4] bg-white shadow-sm lg:col-span-2"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.revenueTrajectory}</CardTitle><CardDescription className="text-xs">{labels.revenueTrajectoryDesc}</CardDescription></CardHeader><CardContent><TrendLineChart data={data.financials.years} accessor={(item) => item.revenue} color="#18181C" suffix=" Cr" /></CardContent></Card><Card className="border-[#E5DFD4] bg-[#18181C] text-white shadow-sm"><CardContent className="p-5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">{labels.revenue2025}</p><p className="mt-3 text-4xl font-extrabold tracking-tight"><AnimatedNumber value={data.financials.years[2].revenue} prefix="₹" suffix=" Cr" decimals={1} /></p><div className="mt-5 space-y-3"><div className="flex items-center justify-between text-xs"><span className="text-neutral-400">{labels.growth}</span><span className="font-extrabold text-emerald-300">+{data.financials.years[2].revenueGrowth}%</span></div><div className="flex items-center justify-between text-xs"><span className="text-neutral-400">{labels.financialHealth}</span><span className="font-extrabold text-emerald-300">{data.health.dimensions.find((dimension) => dimension.key === "financialHealth")?.value ?? 74}/100</span></div><div className="flex items-center justify-between text-xs"><span className="text-neutral-400">{labels.grossMargin}</span><span className="font-extrabold text-emerald-300">{data.financials.years[2].grossMargin}%</span></div><div className="flex items-center justify-between text-xs"><span className="text-neutral-400">{labels.ebitdaMargin}</span><span className="font-extrabold text-emerald-300">{data.financials.years[2].ebitdaMargin}%</span></div></div></CardContent></Card></div><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.marginExpansion}</CardTitle><CardDescription className="text-xs">{labels.descMarginExpansion}</CardDescription></CardHeader><CardContent className="space-y-4"><BarRow label={labels.grossMargin} value={data.financials.years[2].grossMargin} max={100} color="#8B5CF6" suffix="%" /><BarRow label={labels.ebitdaMargin} value={data.financials.years[2].ebitdaMargin} max={100} color="#18181C" suffix="%" /><div className="grid grid-cols-3 gap-2 pt-2">{data.financials.years.map((year) => <div key={year.year} className="rounded-xl bg-[#FAF8F2] p-2 text-center"><p className="text-[10px] font-bold text-neutral-500">{year.year}</p><p className="mt-1 text-xs font-extrabold text-neutral-900">{year.grossMargin}% / {year.ebitdaMargin}%</p></div>)}</div></CardContent></Card><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.ltvVsCac}</CardTitle><CardDescription className="text-xs">{labels.descLtvVsCac}</CardDescription></CardHeader><CardContent><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.ltv}</p><p className="mt-1 text-2xl font-extrabold text-neutral-900">₹{new Intl.NumberFormat("en-IN").format(data.financials.ltv)}</p></div><div className="text-right"><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{labels.cac}</p><p className="mt-1 text-2xl font-extrabold text-neutral-900">₹{new Intl.NumberFormat("en-IN").format(data.financials.cac)}</p></div><div className="rounded-2xl bg-emerald-50 px-3 py-2 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{labels.ltvCac}</p><p className="text-xl font-extrabold text-emerald-800">{data.financials.ltvCac}x</p></div></div><div className="mt-5"><BarRow label={labels.lifetimeValue} value={data.financials.ltv} max={60000} color="#10B981" prefix="₹" /><div className="mt-3"><BarRow label={labels.acquisitionCost} value={data.financials.cac} max={60000} color="#F59E0B" prefix="₹" /></div></div></CardContent></Card></div></section>

    <section><SectionHeading eyebrow={labels.eyebrowCustomer} title={labels.customerBase} description={labels.descCustomerBase} /><div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]"><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.customerHealth}</CardTitle><CardDescription className="text-xs">{labels.descCustomerHealth}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><MetricCard label={labels.totalCustomers} labels={labels} value={new Intl.NumberFormat("en-IN").format(data.customers.total)} icon={Users} tone="neutral" /><MetricCard label={labels.activeCustomers} labels={labels} value={new Intl.NumberFormat("en-IN").format(data.customers.active)} icon={Activity} tone="positive" /><MetricCard label={labels.monthlyActiveUsers} labels={labels} value={new Intl.NumberFormat("en-IN").format(data.customers.monthlyActiveUsers)} icon={TrendingUp} tone="positive" /><MetricCard label={labels.nps} labels={labels} value={data.customers.nps} icon={Target} tone="positive" /></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{labels.retention}</p><p className="mt-1 text-xl font-extrabold text-emerald-900">{data.customers.retention}%</p></div><div className="rounded-2xl bg-red-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-red-700">{labels.churn}</p><p className="mt-1 text-xl font-extrabold text-red-900">{data.customers.churn}%</p></div></div></CardContent></Card><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">{labels.revenueBySegment}</CardTitle><CardDescription className="text-xs">{labels.descRevenueBySegment}</CardDescription></CardHeader><CardContent><div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center"><Donut center={`${data.customers.segments[0]?.revenueContribution ?? 0}%`} subtext={data.customers.segments[0]?.name ?? ""} segments={data.customers.segments} /><div className="w-full space-y-4">{data.customers.segments.map((segment) => <div key={segment.name}><div className="mb-1 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-bold text-neutral-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />{segment.name}</span><span className="font-extrabold text-neutral-900">{segment.revenueContribution}%</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${segment.revenueContribution * 2}%`, backgroundColor: segment.color }} /></div><p className="mt-1 text-[10px] text-neutral-400">{new Intl.NumberFormat("en-IN").format(segment.customers)} {labels.customersSuffix}</p></div>)}</div></div></CardContent></Card></div></section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]"><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base font-extrabold text-neutral-900">{labels.marketOpportunity}</CardTitle><CardDescription className="text-xs">{labels.descMarketOpportunity}</CardDescription></div><Globe2 className="h-5 w-5 text-neutral-400" /></div></CardHeader><CardContent><div className="space-y-4"><BarRow label={labels.tam} value={data.market.tam} max={data.market.tam} color="#18181C" suffix=" Cr" /><BarRow label={labels.sam} value={data.market.sam} max={data.market.tam} color="#8B5CF6" suffix=" Cr" /><BarRow label={labels.som} value={data.market.som} max={data.market.tam} color="#B8DF9E" suffix=" Cr" /></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-[#FAF8F2] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{labels.marketShare}</p><p className="mt-1 text-xl font-extrabold text-neutral-900">{data.market.marketShare}%</p></div><div className="rounded-2xl bg-[#FAF8F2] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{labels.marketCagr}</p><p className="mt-1 text-xl font-extrabold text-neutral-900">{data.market.cagr}%</p></div><div className="rounded-2xl bg-[#FAF8F2] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{labels.attractiveness}</p><p className="mt-1 text-xl font-extrabold text-neutral-900">{data.market.attractiveness}/100</p></div></div><MiniGrowthChart values={[8, 10.5, 12.7, 15.1, data.market.cagr]} labels={labels} /><div className="mt-4 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><div className="flex items-center gap-2 text-xs font-extrabold text-neutral-900"><Lightbulb className="h-4 w-4 text-amber-500" />{labels.opportunityCard}</div><p className="mt-2 text-xs leading-relaxed text-neutral-600">{data.market.opportunity}</p></div></CardContent></Card><Card className="border-[#E5DFD4] bg-white shadow-sm"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base font-extrabold text-neutral-900">{labels.competitivePosition}</CardTitle><CardDescription className="text-xs">{labels.descCompetitivePosition}</CardDescription></div><BarChart3 className="h-5 w-5 text-neutral-400" /></div></CardHeader><CardContent><RadarChart competitors={data.competitors} labels={labels} /><p className="mt-4 rounded-2xl bg-[#FAF8F2] p-3 text-xs leading-relaxed text-neutral-700">{data.competitivePosition}</p></CardContent></Card></section>

    <section><SectionHeading eyebrow={labels.eyebrowStrategic} title={labels.swotAnalysis} description={labels.descSwot} /><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{swotCards.map(({ title, items, tone, icon: Icon }) => <div key={title} className={`rounded-2xl border p-5 ${tone}`}><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-neutral-700" /><h3 className="text-sm font-extrabold text-neutral-900">{title}</h3></div><ul className="mt-4 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-neutral-700"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500" />{item}</li>)}</ul></div>)}</div></section>

    <section><SectionHeading eyebrow={labels.eyebrowAi} title={labels.aiInsights} description={labels.descAiInsights} /><div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{data.insights.map((insight) => <InsightCard key={insight.id} insight={insight} expanded={expandedInsight === insight.id} labels={labels} onToggle={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)} />)}</div></section>

    <section><SectionHeading eyebrow={labels.eyebrowRecommendation} title={labels.aiRecommendations} description={labels.descAiRecommendations} /><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{data.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} labels={labels} />)}</div><div className="mt-6"><SectionHeading eyebrow={labels.priorityMatrix} title={labels.priorityMatrixTitle} description={labels.descPriorityMatrix} /><PriorityMatrix recommendations={data.recommendations} labels={labels} selected={selectedRecommendation} onSelect={(id) => setSelectedRecommendation(id)} />{selectedRecommendation && <div className="mt-3 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3 text-xs text-neutral-700"><span className="font-extrabold text-neutral-900">{labels.selectedPrefix} </span>{data.recommendations.find((recommendation) => recommendation.id === selectedRecommendation)?.outcome}</div>}</div></section>

    <section><SectionHeading eyebrow={labels.eyebrowKpi} title={labels.kpis} description={labels.descKpis} /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{data.kpis.map((kpi) => <MetricCard key={kpi.label} label={kpi.label} labels={labels} value={kpi.value} icon={KPI_ICONS[data.kpis.indexOf(kpi)] ?? Activity} trend={kpi.trend} tone="positive" />)}</div></section>


    <section><SectionHeading eyebrow={labels.eyebrowRoadmap} title={labels.executionRoadmap} description={labels.descRoadmap} /><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{data.roadmap.map((quarter, index) => <div key={quarter.quarter} className="relative rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181C] text-xs font-extrabold text-white">{quarter.quarter}</div><Route className="h-4 w-4 text-neutral-400" /></div><h3 className="mt-4 text-sm font-extrabold text-neutral-900">{quarter.theme}</h3><ul className="mt-3 space-y-2">{quarter.items.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-neutral-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}</li>)}</ul>{index < data.roadmap.length - 1 && <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-[#E5DFD4] xl:block" />}</div>)}</div></section>


    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p><span className="font-extrabold">{labels.disclaimerPrefix}</span> {data.disclaimer}</p></div>
  </div>
}
