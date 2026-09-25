import type {
  DemoCompetitor,
  DemoCustomerSegment,
  DemoFinancialYear,
  DemoHealthDimension,
  DemoInsight,
  DemoQA,
  DemoRecommendation,
  DemoRisk,
} from "@/lib/demo-business-data"

/** Output languages supported for the Aarohan hackathon demo. */
export const AAROHAN_OUTPUT_LANGUAGES = ["en", "hi"] as const
export type AarohanOutputLanguage = (typeof AAROHAN_OUTPUT_LANGUAGES)[number]

export function normalizeOutputLanguage(value: unknown): AarohanOutputLanguage {
  return value === "hi" ? "hi" : "en"
}

/**
 * Every user-visible chrome string rendered by the Business Analysis dashboard.
 * The English set is the exact wording the dashboard already used, so the
 * pre-existing NovaCart demo renders identically.
 */
export type AnalysisLabels = {
  demoMode: string
  employees: string
  annualGrowth: string
  fictionalData: string
  resetDemo: string
  improving: string
  watch: string

  eyebrowOverview: string
  titleOverallHealth: string
  descOverallHealth: string
  illustrativeDemoData: string
  scoreOverall: string
  businessHealth: string
  illustrativeScoreOnly: string
  strongSignal: string
  areaToValidate: string

  executiveSummary: string
  descExecutiveSummary: string
  keyOpportunity: string
  keyRisk: string
  recommendedPriority: string

  companyProfile: string
  descCompanyProfile: string
  industry: string
  founded: string
  businessModel: string
  annualRevenue: string
  marketAndWebsite: string
  targetCustomers: string
  primaryProducts: string

  eyebrowFinancial: string
  financialPerformance: string
  descFinancialPerformance: string
  revenueTrajectory: string
  revenueTrajectoryDesc: string
  revenue2025: string
  growth: string
  financialHealth: string
  grossMargin: string
  ebitdaMargin: string
  marginExpansion: string
  descMarginExpansion: string
  ltvVsCac: string
  descLtvVsCac: string
  ltv: string
  cac: string
  lifetimeValue: string
  acquisitionCost: string

  eyebrowCustomer: string
  customerBase: string
  descCustomerBase: string
  customerHealth: string
  descCustomerHealth: string
  totalCustomers: string
  activeCustomers: string
  monthlyActiveUsers: string
  nps: string
  retention: string
  churn: string
  revenueBySegment: string
  descRevenueBySegment: string
  customersSuffix: string

  eyebrowStrategic: string
  swotAnalysis: string
  descSwot: string
  strengths: string
  weaknesses: string
  opportunities: string
  threats: string

  marketOpportunity: string
  descMarketOpportunity: string
  tam: string
  sam: string
  som: string
  marketShare: string
  marketCagr: string
  attractiveness: string
  marketGrowthTrajectory: string
  illustrativeCagr: string
  opportunityCard: string

  competitivePosition: string
  descCompetitivePosition: string
  radarAriaLabel: string

  eyebrowAi: string
  aiInsights: string
  descAiInsights: string
  impact: string
  confidence: string
  recommendedAction: string

  eyebrowRecommendation: string
  aiRecommendations: string
  descAiRecommendations: string
  effort: string
  priorityMatrix: string
  priorityMatrixTitle: string
  descPriorityMatrix: string
  qHighLow: string
  qHighLowSub: string
  qHighMedium: string
  qHighMediumSub: string
  qMediumMedium: string
  qMediumMediumSub: string
  qMediumHigh: string
  qMediumHighSub: string
  selectedPrefix: string

  eyebrowKpi: string
  kpis: string
  descKpis: string
  revenueGrowth: string
  customerRetention: string
  ltvCac: string
  aiReadiness: string

  eyebrowRisk: string
  businessRisks: string
  descBusinessRisks: string
  risk: string
  probability: string
  impactColumn: string
  severity: string
  suggestedMitigation: string

  eyebrowRoadmap: string
  executionRoadmap: string
  descRoadmap: string

  eyebrowSimulator: string
  exploreScenarios: string
  descSimulator: string
  recalculating: string
  instantSimulation: string
  customerGrowthControl: string
  cacReductionControl: string
  retentionImprovementControl: string
  projectedImpact: string
  scenarioOutcome: string
  projectedRevenue: string
  customerCount: string
  estimatedProfit: string
  projectedLtv: string
  growthRate: string
  simulatorDisclaimer: string

  askAiTitle: string
  askAiSubtitle: string
  askPlaceholder: string
  askButton: string
  demoResponse: string
  qaFallback: string

  disclaimerPrefix: string
}

export type AnalysisKpi = { label: string; value: string; trend?: "up" | "down" }

export type AnalysisDataset = {
  labels: AnalysisLabels
  status: string
  disclaimer: string
  company: {
    name: string
    industry: string
    companyType: string
    founded: string
    headquarters: string
    website: string
    employees: number
    annualRevenue: string
    annualGrowth: string
    primaryMarket: string
    businessModel: string
    targetCustomers: string[]
    primaryProducts: string[]
    description: string
  }
  health: { overall: number; dimensions: DemoHealthDimension[] }
  executiveSummary: string
  executiveHighlights: { opportunity: string; risk: string; priority: string }
  financials: { years: DemoFinancialYear[]; cac: number; ltv: number; ltvCac: number }
  customers: {
    total: number
    active: number
    enterprise: number
    smb: number
    monthlyActiveUsers: number
    retention: number
    churn: number
    nps: number
    segments: DemoCustomerSegment[]
  }
  market: {
    name: string
    tam: number
    sam: number
    som: number
    marketShare: number
    cagr: number
    attractiveness: number
    opportunity: string
  }
  competitors: DemoCompetitor[]
  competitivePosition: string
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
  insights: DemoInsight[]
  recommendations: DemoRecommendation[]
  risks: DemoRisk[]
  roadmap: Array<{ quarter: string; theme: string; items: string[] }>
  scenarios: {
    customerGrowth: number[]
    cacReduction: number[]
    retentionImprovement: number[]
    defaults: { customerGrowth: number; cacReduction: number; retentionImprovement: number }
  }
  kpis: AnalysisKpi[]
  qa: DemoQA[]
}

const EN_LABELS: AnalysisLabels = {
  demoMode: "DEMO MODE",
  employees: "employees",
  annualGrowth: "annual growth",
  fictionalData: "Fictional data for demonstration",
  resetDemo: "Reset Demo",
  improving: "Improving",
  watch: "Watch",

  eyebrowOverview: "Business overview",
  titleOverallHealth: "Overall Business Health",
  descOverallHealth: "An illustrative scorecard that demonstrates how INTELLY can connect growth, customer, financial, and innovation signals.",
  illustrativeDemoData: "Illustrative Demo Data",
  scoreOverall: "overall",
  businessHealth: "Business Health",
  illustrativeScoreOnly: "Illustrative score only",
  strongSignal: "Strong illustrative signal",
  areaToValidate: "Area to validate",

  executiveSummary: "Executive Summary",
  descExecutiveSummary: "A concise strategic view of momentum, opportunity, and risk.",
  keyOpportunity: "Key Opportunity",
  keyRisk: "Key Risk",
  recommendedPriority: "Recommended Priority",

  companyProfile: "Company Profile",
  descCompanyProfile: "Centralized fictional company context.",
  industry: "Industry",
  founded: "Founded",
  businessModel: "Business model",
  annualRevenue: "Annual revenue",
  marketAndWebsite: "Primary market & website",
  targetCustomers: "Target customers",
  primaryProducts: "Primary products",

  eyebrowFinancial: "Financial analysis",
  financialPerformance: "Financial Performance",
  descFinancialPerformance: "Illustrative revenue, margin, and unit-economics signals.",
  revenueTrajectory: "Revenue trajectory",
  revenueTrajectoryDesc: "Revenue in ₹ Crore · deterministic demo values",
  revenue2025: "2025 revenue",
  growth: "Growth",
  financialHealth: "Financial health",
  grossMargin: "Gross margin",
  ebitdaMargin: "EBITDA margin",
  marginExpansion: "Margin expansion",
  descMarginExpansion: "Gross margin and EBITDA margin",
  ltvVsCac: "LTV vs CAC",
  descLtvVsCac: "Illustrative unit economics",
  ltv: "LTV",
  cac: "CAC",
  lifetimeValue: "Lifetime value",
  acquisitionCost: "Acquisition cost",

  eyebrowCustomer: "Customer analysis",
  customerBase: "Customer Base & Segments",
  descCustomerBase: "Illustrative customer scale, engagement, retention, and revenue contribution.",
  customerHealth: "Customer health",
  descCustomerHealth: "Retention and engagement snapshot",
  totalCustomers: "Total customers",
  activeCustomers: "Active customers",
  monthlyActiveUsers: "Monthly active users",
  nps: "NPS",
  retention: "Retention",
  churn: "Churn",
  revenueBySegment: "Revenue contribution by segment",
  descRevenueBySegment: "Enterprise concentration creates a high-value expansion pool.",
  customersSuffix: "customers",

  eyebrowStrategic: "Strategic analysis",
  swotAnalysis: "SWOT Analysis",
  descSwot: "A structured view of internal strengths and external context.",
  strengths: "Strengths",
  weaknesses: "Weaknesses",
  opportunities: "Opportunities",
  threats: "Threats",

  marketOpportunity: "Market opportunity",
  descMarketOpportunity: "Illustrative market sizing assumptions",
  tam: "TAM",
  sam: "SAM",
  som: "SOM",
  marketShare: "Market share",
  marketCagr: "Market CAGR",
  attractiveness: "Attractiveness",
  marketGrowthTrajectory: "Market growth trajectory",
  illustrativeCagr: "Illustrative CAGR",
  opportunityCard: "Opportunity card",

  competitivePosition: "Competitive position",
  descCompetitivePosition: "Fictional peers · not a market ranking",
  radarAriaLabel: "Illustrative competitor comparison radar chart",

  eyebrowAi: "AI insights",
  aiInsights: "AI-Powered Insights",
  descAiInsights: "Expand each insight to inspect impact, confidence, priority, and the recommended next action.",
  impact: "Impact",
  confidence: "Confidence",
  recommendedAction: "Recommended action",

  eyebrowRecommendation: "Recommendation engine",
  aiRecommendations: "AI Strategic Recommendations",
  descAiRecommendations: "A prioritized set of actions for management discussion.",
  effort: "Effort",
  priorityMatrix: "Priority matrix",
  priorityMatrixTitle: "Impact vs Implementation Effort",
  descPriorityMatrix: "Click a recommendation to focus the conversation on the next strategic move.",
  qHighLow: "High impact · Low effort",
  qHighLowSub: "Do next",
  qHighMedium: "High impact · Medium effort",
  qHighMediumSub: "Plan and fund",
  qMediumMedium: "Medium impact · Medium effort",
  qMediumMediumSub: "Test and learn",
  qMediumHigh: "Medium impact · High effort",
  qMediumHighSub: "Validate before scaling",
  selectedPrefix: "Selected:",

  eyebrowKpi: "Business health dashboard",
  kpis: "Key Performance Indicators",
  descKpis: "A concise operating view for leadership.",
  revenueGrowth: "Revenue growth",
  customerRetention: "Customer retention",
  ltvCac: "LTV / CAC",
  aiReadiness: "AI readiness",

  eyebrowRisk: "Risk analysis",
  businessRisks: "Business Risks",
  descBusinessRisks: "Illustrative risks with practical mitigation themes.",
  risk: "Risk",
  probability: "Probability",
  impactColumn: "Impact",
  severity: "Severity",
  suggestedMitigation: "Suggested mitigation",

  eyebrowRoadmap: "12-month strategic roadmap",
  executionRoadmap: "Execution Roadmap",
  descRoadmap: "A sequenced view of the next four quarters.",

  eyebrowSimulator: "What-if simulator",
  exploreScenarios: "Explore Strategic Scenarios",
  descSimulator: "Change the assumptions to see illustrative business impact update instantly.",
  recalculating: "Recalculating…",
  instantSimulation: "Instant simulation",
  customerGrowthControl: "Customer growth",
  cacReductionControl: "CAC reduction",
  retentionImprovementControl: "Retention improvement",
  projectedImpact: "Projected Business Impact",
  scenarioOutcome: "Illustrative scenario outcome",
  projectedRevenue: "Projected revenue",
  customerCount: "Customer count",
  estimatedProfit: "Estimated profit",
  projectedLtv: "Projected LTV",
  growthRate: "Growth rate",
  simulatorDisclaimer: "Scenario outputs are deterministic illustrations based on the selected assumptions. They are not forecasts or verified financial guidance.",

  askAiTitle: "Ask AI",
  askAiSubtitle: "A local, instant demo conversation. No external AI request is made.",
  askPlaceholder: "Ask a suggested question...",
  askButton: "Ask",
  demoResponse: "INTELLY Demo Response",
  qaFallback: "Demo Mode uses a curated local answer set. Try one of the suggested questions to explore strategic opportunities, risks, profitability, customer focus, AI monetization, and next-quarter priorities.",

  disclaimerPrefix: "Illustrative Demo Data.",
}

const HI_LABELS: AnalysisLabels = {
  demoMode: "डेमो मोड",
  employees: "कर्मचारी",
  annualGrowth: "वार्षिक वृद्धि",
  fictionalData: "प्रदर्शन के लिए काल्पनिक डेटा",
  resetDemo: "डेमो रीसेट करें",
  improving: "सुधार हो रहा है",
  watch: "ध्यान दें",

  eyebrowOverview: "व्यावसायिक अवलोकन",
  titleOverallHealth: "समग्र व्यवसाय स्वास्थ्य",
  descOverallHealth: "एक उदाहरणात्मक स्कोरकार्ड जो दर्शाता है कि INTELLY वृद्धि, ग्राहक, वित्तीय और नवाचार संकेतों को कैसे जोड़ सकता है।",
  illustrativeDemoData: "उदाहरणात्मक डेमो डेटा",
  scoreOverall: "समग्र",
  businessHealth: "व्यावसायिक स्वास्थ्य",
  illustrativeScoreOnly: "केवल उदाहरणात्मक स्कोर",
  strongSignal: "मजबूत उदाहरणात्मक संकेत",
  areaToValidate: "सत्यापन योग्य क्षेत्र",

  executiveSummary: "व्यावसायिक सारांश",
  descExecutiveSummary: "गति, अवसर और जोखिम का संक्षिप्त रणनीतिक दृष्टिकोण।",
  keyOpportunity: "मुख्य अवसर",
  keyRisk: "मुख्य जोखिम",
  recommendedPriority: "अनुशंसित प्राथमिकता",

  companyProfile: "कंपनी प्रोफ़ाइल",
  descCompanyProfile: "केंद्रीकृत काल्पनिक कंपनी संदर्भ।",
  industry: "उद्योग",
  founded: "स्थापना",
  businessModel: "व्यवसाय मॉडल",
  annualRevenue: "वार्षिक राजस्व",
  marketAndWebsite: "प्राथमिक बाज़ार और वेबसाइट",
  targetCustomers: "लक्षित ग्राहक",
  primaryProducts: "प्राथमिक उत्पाद",

  eyebrowFinancial: "वित्तीय विश्लेषण",
  financialPerformance: "वित्तीय प्रदर्शन",
  descFinancialPerformance: "उदाहरणात्मक राजस्व, मार्जिन और यूनिट-इकोनॉमिक्स संकेत।",
  revenueTrajectory: "राजस्व प्रवृत्ति",
  revenueTrajectoryDesc: "₹ करोड़ में राजस्व · निर्धारित डेमो मान",
  revenue2025: "2025 राजस्व",
  growth: "वृद्धि",
  financialHealth: "वित्तीय स्वास्थ्य",
  grossMargin: "सकल मार्जिन",
  ebitdaMargin: "EBITDA मार्जिन",
  marginExpansion: "मार्जिन विस्तार",
  descMarginExpansion: "सकल मार्जिन और EBITDA मार्जिन",
  ltvVsCac: "LTV बनाम CAC",
  descLtvVsCac: "उदाहरणात्मक यूनिट इकोनॉमिक्स",
  ltv: "LTV",
  cac: "CAC",
  lifetimeValue: "आजीवन मूल्य",
  acquisitionCost: "अधिग्रहण लागत",

  eyebrowCustomer: "ग्राहक विश्लेषण",
  customerBase: "ग्राहक आधार और सेगमेंट",
  descCustomerBase: "उदाहरणात्मक ग्राहक पैमाना, सहभागिता, रिटेंशन और राजस्व योगदान।",
  customerHealth: "ग्राहक स्वास्थ्य",
  descCustomerHealth: "रिटेंशन और सहभागिता का सारांश",
  totalCustomers: "कुल ग्राहक",
  activeCustomers: "सक्रिय ग्राहक",
  monthlyActiveUsers: "मासिक सक्रिय उपयोगकर्ता",
  nps: "NPS",
  retention: "रिटेंशन",
  churn: "चर्न",
  revenueBySegment: "सेगमेंट द्वारा राजस्व योगदान",
  descRevenueBySegment: "एंटरप्राइज़ एकाग्रता उच्च-मूल्य विस्तार पूल बनाती है।",
  customersSuffix: "ग्राहक",

  eyebrowStrategic: "रणनीतिक विश्लेषण",
  swotAnalysis: "SWOT विश्लेषण",
  descSwot: "आंतरिक शक्तियों और बाहरी संदर्भ का संरचित दृष्टिकोण।",
  strengths: "शक्तियाँ",
  weaknesses: "कमजोरियाँ",
  opportunities: "अवसर",
  threats: "खतरे",

  marketOpportunity: "बाज़ार अवसर",
  descMarketOpportunity: "उदाहरणात्मक बाज़ार आकार अनुमान",
  tam: "TAM",
  sam: "SAM",
  som: "SOM",
  marketShare: "बाज़ार हिस्सेदारी",
  marketCagr: "बाज़ार CAGR",
  attractiveness: "आकर्षण",
  marketGrowthTrajectory: "बाज़ार वृद्धि प्रवृत्ति",
  illustrativeCagr: "उदाहरणात्मक CAGR",
  opportunityCard: "अवसर कार्ड",

  competitivePosition: "प्रतिस्पर्धी स्थिति",
  descCompetitivePosition: "काल्पनिक प्रतिद्वंद्वी · बाज़ार रैंकिंग नहीं",
  radarAriaLabel: "उदाहरणात्मक प्रतिद्वंद्वी तुलना रडार चार्ट",

  eyebrowAi: "AI अंतर्दृष्टि",
  aiInsights: "AI-संचालित अंतर्दृष्टि",
  descAiInsights: "प्रभाव, विश्वास, प्राथमिकता और अनुशंसित अगली कार्रवाई देखने के लिए प्रत्येक अंतर्दृष्टि विस्तार करें।",
  impact: "प्रभाव",
  confidence: "विश्वास",
  recommendedAction: "अनुशंसित कार्रवाई",

  eyebrowRecommendation: "सिफारिश इंजन",
  aiRecommendations: "AI रणनीतिक सिफारिशें",
  descAiRecommendations: "प्रबंधन चर्चा के लिए प्राथमिकता वाली कार्रवाइयों का समूह।",
  effort: "प्रयास",
  priorityMatrix: "प्राथमिकता मैट्रिक्स",
  priorityMatrixTitle: "प्रभाव बनाम कार्यान्वयन प्रयास",
  descPriorityMatrix: "अगली रणनीतिक चाल पर ध्यान केंद्रित करने के लिए सिफारिश चुनें।",
  qHighLow: "उच्च प्रभाव · कम प्रयास",
  qHighLowSub: "अगले करें",
  qHighMedium: "उच्च प्रभाव · मध्यम प्रयास",
  qHighMediumSub: "योजना और निधि",
  qMediumMedium: "मध्यम प्रभाव · मध्यम प्रयास",
  qMediumMediumSub: "परीक्षण करें और सीखें",
  qMediumHigh: "मध्यम प्रभाव · उच्च प्रयास",
  qMediumHighSub: "स्केल से पहले सत्यापन करें",
  selectedPrefix: "चयनित:",

  eyebrowKpi: "व्यावसायिक स्वास्थ्य डैशबोर्ड",
  kpis: "मुख्य प्रदर्शन संकेतक",
  descKpis: "नेतृत्व के लिए एक संक्षिप्त परिचालन दृष्टिकोण।",
  revenueGrowth: "राजस्व वृद्धि",
  customerRetention: "ग्राहक रिटेंशन",
  ltvCac: "LTV / CAC",
  aiReadiness: "AI तत्परता",

  eyebrowRisk: "जोखिम विश्लेषण",
  businessRisks: "व्यावसायिक जोखिम",
  descBusinessRisks: "व्यावहारिक शमन विषयों के साथ उदाहरणात्मक जोखिम।",
  risk: "जोखिम",
  probability: "संभावना",
  impactColumn: "प्रभाव",
  severity: "गंभीरता",
  suggestedMitigation: "सुझाया गया शमन",

  eyebrowRoadmap: "12-महीने की रणनीतिक योजना",
  executionRoadmap: "कार्यान्वयन योजना",
  descRoadmap: "अगले चार तिमाहियों का क्रमबद्ध दृष्टिकोण।",

  eyebrowSimulator: "What-if सिमुलेटर",
  exploreScenarios: "रणनीतिक परिदृश्य देखें",
  descSimulator: "उदाहरणात्मक व्यावसायिक प्रभाव को तुरंत देखने के लिए मान बदलें।",
  recalculating: "पुनर्गणना हो रही है…",
  instantSimulation: "तत्काल सिमुलेशन",
  customerGrowthControl: "ग्राहक वृद्धि",
  cacReductionControl: "CAC में कमी",
  retentionImprovementControl: "रिटेंशन सुधार",
  projectedImpact: "अनुमानित व्यावसायिक प्रभाव",
  scenarioOutcome: "उदाहरणात्मक परिदृश्य परिणाम",
  projectedRevenue: "अनुमानित राजस्व",
  customerCount: "ग्राहक संख्या",
  estimatedProfit: "अनुमानित लाभ",
  projectedLtv: "अनुमानित LTV",
  growthRate: "वृद्धि दर",
  simulatorDisclaimer: "परिदृश्य आउटपुट चयनित मानों पर आधारित निर्धारित उदाहरण हैं। ये अनुमान या सत्यापित वित्तीय मार्गदर्शन नहीं हैं।",

  askAiTitle: "AI से पूछें",
  askAiSubtitle: "एक स्थानीय, तत्काल डेमो बातचीत। कोई बाहरी AI अनुरोध नहीं किया जाता।",
  askPlaceholder: "सुझाया गया प्रश्न पूछें...",
  askButton: "पूछें",
  demoResponse: "INTELLY डेमो प्रतिक्रिया",
  qaFallback: "डेमो मोड एक चयनित स्थानीय उत्तर सेट का उपयोग करता है। रणनीतिक अवसर, जोखिम, लाभप्रदता, ग्राहक फ़ोकस, AI मुनीकरण और अगली तिमाही के प्राथमिकताओं को जानने के लिए सुझाए गए प्रश्नों में से एक आज़माएँ।",

  disclaimerPrefix: "उदाहरणात्मक डेमो डेटा।",
}

export const DEFAULT_ANALYSIS_LABELS: AnalysisLabels = EN_LABELS

const COMPANY_EN = {
  name: "Aarohan Commerce Technologies Pvt. Ltd.",
  industry: "Retail Commerce & SaaS",
  companyType: "Private Limited",
  founded: "2020",
  headquarters: "Ahmedabad, Gujarat, India",
  website: "https://www.aarohan.example",
  employees: 142,
  annualRevenue: "₹36.4 Crore",
  annualGrowth: "28.6%",
  primaryMarket: "India",
  businessModel: "B2C + B2B SaaS",
  targetCustomers: ["Enterprise retail groups", "Mid-market brands", "Small and medium retailers", "Online sellers"],
  primaryProducts: ["Aarohan Commerce Platform", "Aarohan Analytics", "Aarohan AI Recommendations", "Aarohan Seller Intelligence"],
  description: "Aarohan Commerce Technologies Pvt. Ltd. is an Indian retail commerce and SaaS company founded in 2020 and headquartered in Ahmedabad, Gujarat. It helps retailers, brands, and marketplace sellers run digital commerce, customer engagement, analytics, and AI-powered personalization from a unified platform. Aarohan combines storefront infrastructure, customer analytics, recommendation intelligence, and seller insights so businesses can increase conversion, improve retention, and make faster data-driven decisions.",
}

const COMPANY_HI: typeof COMPANY_EN = {
  ...COMPANY_EN,
  targetCustomers: ["एंटरप्राइज़ रिटेल समूह", "मध्य-बाज़ार ब्रांड", "छोटे और मध्यम खुदरा व्यापारी", "ऑनलाइन विक्रेता"],
  description: "आरोहण कॉमर्स टेक्नोलॉजीज प्रा. लि. एक भारतीय रिटेल कॉमर्स और SaaS कंपनी है, जिसकी स्थापना 2020 में अहमदाबाद, गुजरात में हुई। यह खुदरा व्यापारियों, ब्रांडों और मार्केटप्लेस विक्रेताओं को डिजिटल कॉमर्स, ग्राहक सहभागिता, एनालिटिक्स और AI-संचालित पर्सनलाइज़ेशन एकीकृत प्लेटफ़ॉर्म से चलाने में मदद करती है। आरोहण स्टोरफ्रंट इंफ्रास्ट्रक्चर, ग्राहक एनालिटिक्स, रिकमेंडेशन इंटेलिजेंस और सेलर इनसाइट्स को जोड़ता है, ताकि व्यवसाय कन्वर्ज़न बढ़ा सकें, रिटेंशन सुधार सकें और तेज़ डेटा-आधारित निर्णय ले सकें।",
}

const HEALTH_DIMENSIONS: Record<AarohanOutputLanguage, DemoHealthDimension[]> = {
  en: [
    { key: "marketPosition", label: "Market Position", value: 79, tone: "positive" },
    { key: "financialHealth", label: "Financial Health", value: 74, tone: "attention" },
    { key: "customerGrowth", label: "Customer Growth", value: 86, tone: "positive" },
    { key: "operationalEfficiency", label: "Operational Efficiency", value: 76, tone: "positive" },
    { key: "productStrength", label: "Product Strength", value: 88, tone: "positive" },
    { key: "competitivePosition", label: "Competitive Position", value: 72, tone: "attention" },
    { key: "innovationReadiness", label: "Innovation Readiness", value: 91, tone: "positive" },
  ],
  hi: [
    { key: "marketPosition", label: "बाज़ार स्थिति", value: 79, tone: "positive" },
    { key: "financialHealth", label: "वित्तीय स्वास्थ्य", value: 74, tone: "attention" },
    { key: "customerGrowth", label: "ग्राहक वृद्धि", value: 86, tone: "positive" },
    { key: "operationalEfficiency", label: "परिचालन कार्यक्षमता", value: 76, tone: "positive" },
    { key: "productStrength", label: "उत्पाद शक्ति", value: 88, tone: "positive" },
    { key: "competitivePosition", label: "प्रतिस्पर्धी स्थिति", value: 72, tone: "attention" },
    { key: "innovationReadiness", label: "नवाचार तत्परता", value: 91, tone: "positive" },
  ],
}

const FINANCIAL_YEARS: DemoFinancialYear[] = [
  { year: "2023", revenue: 22.1, revenueGrowth: 0, grossMargin: 55, ebitdaMargin: 7 },
  { year: "2024", revenue: 28.3, revenueGrowth: 28.1, grossMargin: 58, ebitdaMargin: 10 },
  { year: "2025", revenue: 36.4, revenueGrowth: 28.6, grossMargin: 61, ebitdaMargin: 12 },
]

const SEGMENTS: Record<AarohanOutputLanguage, DemoCustomerSegment[]> = {
  en: [
    { name: "Enterprise", customers: 3014, revenueContribution: 44, color: "#18181C" },
    { name: "Mid-Market", customers: 2329, revenueContribution: 34, color: "#8B5CF6" },
    { name: "SMB", customers: 1507, revenueContribution: 22, color: "#B8DF9E" },
  ],
  hi: [
    { name: "एंटरप्राइज़", customers: 3014, revenueContribution: 44, color: "#18181C" },
    { name: "मध्य-बाज़ार", customers: 2329, revenueContribution: 34, color: "#8B5CF6" },
    { name: "SMB", customers: 1507, revenueContribution: 22, color: "#B8DF9E" },
  ],
}

const COMPETITORS: DemoCompetitor[] = [
  { name: "Aarohan", color: "#18181C", scores: { product: 84, ai: 82, pricing: 74, analytics: 86, enterprise: 70, experience: 81, scalability: 68 } },
  { name: "CommerceSphere", color: "#8B5CF6", scores: { product: 78, ai: 74, pricing: 79, analytics: 76, enterprise: 73, experience: 78, scalability: 72 } },
  { name: "RetailFlow", color: "#F59E0B", scores: { product: 71, ai: 69, pricing: 82, analytics: 70, enterprise: 67, experience: 73, scalability: 65 } },
  { name: "MarketGrid", color: "#10B981", scores: { product: 76, ai: 77, pricing: 75, analytics: 79, enterprise: 71, experience: 76, scalability: 70 } },
]

const SWOT: Record<AarohanOutputLanguage, { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }> = {
  en: {
    strengths: [
      "Strong customer retention",
      "Growing digital commerce adoption",
      "Improving profit margins",
      "Strong AI product capability",
      "Unified analytics platform",
    ],
    weaknesses: [
      "Limited enterprise penetration",
      "Dependence on digital acquisition",
      "Limited international presence",
      "Small enterprise sales organization",
    ],
    opportunities: [
      "Enterprise expansion",
      "AI-powered personalization",
      "International expansion",
      "Strategic partnerships",
      "Predictive customer analytics",
    ],
    threats: [
      "Increasing competition",
      "Rising customer acquisition costs",
      "Platform dependency",
      "Rapid technology changes",
      "Customer churn",
    ],
  },
  hi: {
    strengths: [
      "मजबूत ग्राहक रिटेंशन",
      "डिजिटल कॉमर्स का बढ़ता उपयोग",
      "बेहतर लाभ मार्जिन",
      "मजबूत AI उत्पाद क्षमता",
      "एकीकृत एनालिटिक्स प्लेटफ़ॉर्म",
    ],
    weaknesses: [
      "सीमित एंटरप्राइज़ पहुंच",
      "डिजिटल ग्राहक अधिग्रहण पर निर्भरता",
      "सीमित अंतरराष्ट्रीय उपस्थिति",
      "छोटी एंटरप्राइज़ बिक्री टीम",
    ],
    opportunities: [
      "एंटरप्राइज़ विस्तार",
      "AI-संचालित पर्सनलाइज़ेशन",
      "अंतरराष्ट्रीय विस्तार",
      "रणनीतिक साझेदारियाँ",
      "प्रेडिक्टिव ग्राहक एनालिटिक्स",
    ],
    threats: [
      "बढ़ती प्रतिस्पर्धा",
      "बढ़ती ग्राहक अधिग्रहण लागत",
      "प्लेटफ़ॉर्म पर निर्भरता",
      "तेज़ तकनीकी बदलाव",
      "ग्राहक चर्न",
    ],
  },
}

const INSIGHTS: Record<AarohanOutputLanguage, DemoInsight[]> = {
  en: [
    {
      id: "retention-opportunity",
      title: "Retention Opportunity",
      body: "Customers using three or more Aarohan modules show stronger retention than single-module customers. Increasing multi-product adoption could improve customer lifetime value and reduce paid acquisition pressure.",
      impact: "High",
      confidence: "High",
      priority: "Critical",
      action: "Launch an adoption program that guides new customers into a second and third module within the first 90 days.",
    },
    {
      id: "enterprise-expansion",
      title: "Enterprise Expansion",
      body: "Enterprise customers contribute 44% of revenue from a minority of accounts, indicating potential for a focused enterprise expansion strategy.",
      impact: "High",
      confidence: "High",
      priority: "High",
      action: "Build an enterprise sales motion with segment-specific integrations, service levels, and proof-of-value packages.",
    },
    {
      id: "margin-opportunity",
      title: "Margin Opportunity",
      body: "Gross margin has improved from 55% to 61% over three years, suggesting increasing operating leverage and stronger platform economics.",
      impact: "High",
      confidence: "High",
      priority: "High",
      action: "Protect infrastructure efficiency while investing selectively in high-retention product capabilities.",
    },
    {
      id: "acquisition-risk",
      title: "Acquisition Risk",
      body: "Customer acquisition costs are rising, creating pressure on growth efficiency. Referral and partner-led acquisition should be evaluated.",
      impact: "High",
      confidence: "Medium",
      priority: "Critical",
      action: "Test referral economics and establish a partner acquisition channel with measurable payback periods.",
    },
    {
      id: "ai-monetization",
      title: "AI Monetization",
      body: "AI-powered recommendation and analytics features represent an opportunity to introduce premium pricing tiers and raise average revenue per account.",
      impact: "High",
      confidence: "Medium",
      priority: "High",
      action: "Package AI recommendations and predictive analytics as a premium tier with usage-based expansion.",
    },
  ],
  hi: [
    {
      id: "retention-opportunity",
      title: "रिटेंशन अवसर",
      body: "तीन या अधिक आरोहण मॉड्यूल का उपयोग करने वाले ग्राहकों का रिटेंशन एकल-मॉड्यूल ग्राहकों से बेहतर रहता है। मल्टी-प्रोडक्ट अपनशन बढ़ाने से ग्राहक आजीवन मूल्य बढ़ सकता है और भुगतान-आधारित अधिग्रहण का दबाव घट सकता है।",
      impact: "High",
      confidence: "High",
      priority: "Critical",
      action: "एक अपनशन प्रोग्राम शुरू करें जो नए ग्राहकों को पहले 90 दिनों में दूसरे और तीसरे मॉड्यूल तक ले जाए।",
    },
    {
      id: "enterprise-expansion",
      title: "एंटरप्राइज़ विस्तार",
      body: "एंटरप्राइज़ ग्राहक अल्प संख्या खातों से 44% राजस्व देते हैं, जो केंद्रित एंटरप्राइज़ विस्तार रणनीति की संभावना दर्शाता है।",
      impact: "High",
      confidence: "High",
      priority: "High",
      action: "सेगमेंट-विशिष्ट इंटीग्रेशन, सर्विस लेवल और मूल्य-प्रमाण पैकेज के साथ एक एंटरप्राइज़ सेल्स मोशन बनाएं।",
    },
    {
      id: "margin-opportunity",
      title: "मार्जिन अवसर",
      body: "तीन वर्षों में सकल मार्जिन 55% से 61% तक बढ़ा है, जो बढ़ते परिचालन लाभ और मजबूत प्लेटफ़ॉर्म अर्थशास्त्र का संकेत है।",
      impact: "High",
      confidence: "High",
      priority: "High",
      action: "उच्च रिटेंशन वाली उत्पाद क्षमताओं में चयनात्मक निवेश करते हुए इंफ्रास्ट्रक्चर दक्षता सुरक्षित रखें।",
    },
    {
      id: "acquisition-risk",
      title: "अधिग्रहण जोखिम",
      body: "ग्राहक अधिग्रहण लागत बढ़ रही है, जिससे वृद्धि दक्षता पर दबाव पड़ रहा है। रेफ़रल और पार्टनर-आधारित अधिग्रहण का मूल्यांकन किया जाना चाहिए।",
      impact: "High",
      confidence: "Medium",
      priority: "Critical",
      action: "रेफ़रल अर्थशास्त्र की जांच करें और मापने योग्य पेबैक अवधि के साथ पार्टनर अधिग्रहण चैनल स्थापित करें।",
    },
    {
      id: "ai-monetization",
      title: "AI मुनीकरण",
      body: "AI-संचालित रिकमेंडेशन और एनालिटिक्स सुविधाएँ प्रीमियम मूल्य निर्धारण परतें शुरू करने और प्रति खाता औसत राजस्व बढ़ाने का अवसर हैं।",
      impact: "High",
      confidence: "Medium",
      priority: "High",
      action: "AI रिकमेंडेशन और प्रेडिक्टिव एनालिटिक्स को उपयोग-आधारित विस्तार के साथ प्रीमियम टियर में पैकेज करें।",
    },
  ],
}

const RECOMMENDATIONS: Record<AarohanOutputLanguage, DemoRecommendation[]> = {
  en: [
    { id: "enterprise-growth", title: "Launch an Enterprise Growth Program", impact: "High", effort: "Medium", priority: "Critical", outcome: "Increase enterprise revenue contribution and improve revenue predictability.", quadrant: "high-medium" },
    { id: "ai-premium", title: "Introduce AI Premium Tier", impact: "High", effort: "Medium", priority: "High", outcome: "Increase ARPU through AI-powered analytics and personalization.", quadrant: "high-medium" },
    { id: "partner-acquisition", title: "Build Partner Acquisition Channel", impact: "Medium–High", effort: "Medium", priority: "High", outcome: "Reduce dependency on paid acquisition.", quadrant: "medium-medium" },
    { id: "multi-product", title: "Increase Multi-Product Adoption", impact: "High", effort: "Low", priority: "High", outcome: "Improve retention and customer lifetime value.", quadrant: "high-low" },
    { id: "tier-two", title: "Expand into Tier-2 Markets", impact: "Medium", effort: "High", priority: "Medium", outcome: "Increase addressable market and customer acquisition opportunities.", quadrant: "medium-high" },
  ],
  hi: [
    { id: "enterprise-growth", title: "एंटरप्राइज़ ग्रोथ प्रोग्राम शुरू करें", impact: "High", effort: "Medium", priority: "Critical", outcome: "एंटरप्राइज़ राजस्व योगदान बढ़ाएं और राजस्व पूर्वानुमेयता सुधारें।", quadrant: "high-medium" },
    { id: "ai-premium", title: "AI प्रीमियम टियर शुरू करें", impact: "High", effort: "Medium", priority: "High", outcome: "AI-संचालित एनालिटिक्स और पर्सनलाइज़ेशन से ARPU बढ़ाएं।", quadrant: "high-medium" },
    { id: "partner-acquisition", title: "पार्टनर अधिग्रहण चैनल बनाएं", impact: "Medium–High", effort: "Medium", priority: "High", outcome: "भुगतान-आधारित अधिग्रहण पर निर्भरता घटाएं।", quadrant: "medium-medium" },
    { id: "multi-product", title: "मल्टी-प्रोडक्ट अपनशन बढ़ाएं", impact: "High", effort: "Low", priority: "High", outcome: "रिटेंशन और ग्राहक आजीवन मूल्य सुधारें।", quadrant: "high-low" },
    { id: "tier-two", title: "टियर-2 बाज़ारों में विस्तार करें", impact: "Medium", effort: "High", priority: "Medium", outcome: "सेवायोग्य बाज़ार और ग्राहक अधिग्रहण अवसर बढ़ाएं।", quadrant: "medium-high" },
  ],
}

const RISKS: Record<AarohanOutputLanguage, DemoRisk[]> = {
  en: [
    { risk: "Rising CAC", probability: "High", impact: "High", severity: "Critical", mitigation: "Shift budget toward referral, partner, and product-led acquisition; monitor payback by channel." },
    { risk: "Customer Churn", probability: "Medium", impact: "High", severity: "High", mitigation: "Use module-adoption cohorts, proactive health scores, and customer-success playbooks." },
    { risk: "Competition", probability: "High", impact: "Medium", severity: "High", mitigation: "Differentiate through AI outcomes, integration depth, and measurable time-to-value." },
    { risk: "Platform Dependency", probability: "Medium", impact: "High", severity: "High", mitigation: "Reduce dependence on any single acquisition platform through owned lifecycle channels." },
    { risk: "International Expansion", probability: "Medium", impact: "Medium", severity: "Moderate", mitigation: "Validate localization, compliance, and partner economics before committing to a full rollout." },
  ],
  hi: [
    { risk: "बढ़ती CAC", probability: "High", impact: "High", severity: "Critical", mitigation: "बजट को रेफ़रल, पार्टनर और प्रोडक्ट-लेड अधिग्रहण की ओर स्थानांतरित करें; चैनलवार पेबैक की निगरानी करें।" },
    { risk: "ग्राहक चर्न", probability: "Medium", impact: "High", severity: "High", mitigation: "मॉड्यूल-अपनशन कोहोर्ट, सक्रिय स्वास्थ्य स्कोर और ग्राहक-सफलता प्लेबुक का उपयोग करें।" },
    { risk: "प्रतिस्पर्धा", probability: "High", impact: "Medium", severity: "High", mitigation: "AI परिणामों, इंटीग्रेशन गहराई और मापने योग्य समय-से-मूल्य के माध्यम से भेदभेद करें।" },
    { risk: "प्लेटफ़ॉर्म पर निर्भरता", probability: "Medium", impact: "High", severity: "High", mitigation: "स्वामित्व वाले लाइफ़साइकल चैनल के माध्यम से किसी एक अधिग्रहण प्लेटफ़ॉर्म पर निर्भरता घटाएं।" },
    { risk: "अंतरराष्ट्रीय विस्तार", probability: "Medium", impact: "Medium", severity: "Moderate", mitigation: "पूर्ण रोलआउट के प्रतिबद्ध होने से पहले स्थानीयकरण, अनुपालन और पार्टनर अर्थशास्त्र को सत्यापित करें।" },
  ],
}

const ROADMAP: Record<AarohanOutputLanguage, Array<{ quarter: string; theme: string; items: string[] }>> = {
  en: [
    { quarter: "Q1", theme: "Retain and monetize", items: ["Launch AI Premium Tier", "Improve customer retention analytics", "Build enterprise sales pipeline"] },
    { quarter: "Q2", theme: "Scale distribution", items: ["Launch partner program", "Improve recommendation engine", "Expand enterprise integrations"] },
    { quarter: "Q3", theme: "Expand the market", items: ["Enter selected Tier-2 markets", "Launch advanced predictive analytics"] },
    { quarter: "Q4", theme: "Extend the platform", items: ["Evaluate international expansion", "Expand AI product portfolio"] },
  ],
  hi: [
    { quarter: "Q1", theme: "रिटेंशन और मुनीकरण", items: ["AI प्रीमियम टियर शुरू करें", "ग्राहक रिटेंशन एनालिटिक्स सुधारें", "एंटरप्राइज़ सेल्स पाइपलाइन बनाएं"] },
    { quarter: "Q2", theme: "वितरण का विस्तार", items: ["पार्टनर प्रोग्राम शुरू करें", "रिकमेंडेशन इंजन सुधारें", "एंटरप्राइज़ इंटीग्रेशन बढ़ाएं"] },
    { quarter: "Q3", theme: "बाज़ार का विस्तार", items: ["चयनित टियर-2 बाज़ारों में प्रवेश करें", "उन्नत प्रेडिक्टिव एनालिटिक्स शुरू करें"] },
    { quarter: "Q4", theme: "प्लेटफ़ॉर्म का विस्तार", items: ["अंतरराष्ट्रीय विस्तार का मूल्यांकन करें", "AI उत्पाद पोर्टफ़ोलियो बढ़ाएं"] },
  ],
}

const QA: Record<AarohanOutputLanguage, DemoQA[]> = {
  en: [
    { question: "What is the biggest growth opportunity?", answer: "The biggest growth opportunity is a focused enterprise expansion program. Enterprise customers already contribute 44% of revenue, so improving enterprise penetration can raise revenue predictability without requiring proportionate growth in the long-tail SMB base." },
    { question: "What are the biggest risks?", answer: "The most important risks are rising customer acquisition cost, churn, and platform dependency. Aarohan should protect retention, diversify acquisition channels, and measure payback by channel before scaling spend." },
    { question: "How can Aarohan improve profitability?", answer: "Aarohan can improve profitability by increasing multi-product adoption, protecting infrastructure leverage, and monetizing AI capabilities through a premium tier. These moves support higher ARPU without relying only on acquisition volume." },
    { question: "Which customer segment should be prioritized?", answer: "Enterprise should be the strategic priority, while SMB remains an important adoption and expansion base. A focused enterprise motion offers the strongest revenue concentration opportunity, supported by integrations and service-level packaging." },
    { question: "How can AI increase revenue?", answer: "AI can increase revenue through premium recommendations, predictive customer analytics, personalization, and seller intelligence. The best path is to tie each AI feature to a measurable conversion, retention, or ARPU outcome." },
    { question: "What should management focus on next quarter?", answer: "Management should focus on launching the AI Premium Tier, improving retention analytics, and building the enterprise sales pipeline. These actions balance near-term monetization with the company's largest structural growth opportunity." },
  ],
  hi: [
    { question: "सबसे बड़ा वृद्धि अवसर क्या है?", answer: "सबसे बड़ा वृद्धि अवसर केंद्रित एंटरप्राइज़ विस्तार प्रोग्राम है। एंटरप्राइज़ ग्राहक पहले से 44% राजस्व देते हैं, इसलिए एंटरप्राइज़ पहुंच बढ़ाने से लंबी पूँजी वाले SMB आधार में समानुपातिक वृद्धि के बिना राजस्व पूर्वानुमेयता बढ़ सकती है।" },
    { question: "सबसे बड़े जोखिम क्या हैं?", answer: "सबसे महत्वपूर्ण जोखिम बढ़ती ग्राहक अधिग्रहण लागत, चर्न और प्लेटफ़ॉर्म पर निर्भरता हैं। आरोहण को रिटेंशन सुरक्षित रखना चाहिए, अधिग्रहण चैनल विविधित करने चाहिए और खर्च बढ़ाने से पहले चैनलवार पेबैक मापना चाहिए।" },
    { question: "आरोहण लाभप्रदता कैसे बढ़ा सकता है?", answer: "आरोहण मल्टी-प्रोडक्ट अपनशन बढ़ाकर, इंफ्रास्ट्रक्चर लाभ सुरक्षित रखकर और प्रीमियम टियर के माध्यम से AI क्षमताओं का मुनीकरण करके लाभप्रदता बढ़ा सकता है। ये कदम केवल अधिग्रहण मात्रा पर निर्भर रहे बिना ARPU बढ़ाते हैं।" },
    { question: "किस ग्राहक सेगमेंट को प्राथमिकता दी जानी चाहिए?", answer: "एंटरप्राइज़ को रणनीतिक प्राथमिकता दी जानी चाहिए, जबकि SMB महत्वपूर्ण अपनशन और विस्तार आधार बना रहता है। केंद्रित एंटरप्राइज़ मोशन इंटीग्रेशन और सर्विस-लेवल पैकेजिंग के समर्थन से सबसे मजबूत राजस्व एकाग्रता अवसर देता है।" },
    { question: "AI कैसे राजस्व बढ़ा सकता है?", answer: "AI प्रीमियम रिकमेंडेशन, प्रेडिक्टिव ग्राहक एनालिटिक्स, पर्सनलाइज़ेशन और सेलर इंटेलिजेंस के माध्यम से राजस्व बढ़ा सकता है। सर्वोत्तम मार्ग प्रत्येक AI सुविधा को मापने योग्य कन्वर्ज़न, रिटेंशन या ARPU परिणाम से जोड़ना है।" },
    { question: "प्रबंधन को अगली तिमाही में किस पर ध्यान देना चाहिए?", answer: "प्रबंधन को AI प्रीमियम टियर शुरू करने, रिटेंशन एनालिटिक्स सुधारने और एंटरप्राइज़ सेल्स पाइपलाइन बनाने पर ध्यान देना चाहिए। ये कार्रवाइयां निकट-मध्यवर्ती मुनीकरण और कंपनी के सबसे बड़े संरचनात्मक वृद्धि अवसर को संतुलित करती हैं।" },
  ],
}

const KPIS: Record<AarohanOutputLanguage, AnalysisKpi[]> = {
  en: [
    { label: "Revenue growth", value: "28.6%", trend: "up" },
    { label: "Customer retention", value: "81%", trend: "up" },
    { label: "Gross margin", value: "61%", trend: "up" },
    { label: "LTV / CAC", value: "6.2x" },
    { label: "NPS", value: "61" },
    { label: "AI readiness", value: "91/100" },
  ],
  hi: [
    { label: "राजस्व वृद्धि", value: "28.6%", trend: "up" },
    { label: "ग्राहक रिटेंशन", value: "81%", trend: "up" },
    { label: "सकल मार्जिन", value: "61%", trend: "up" },
    { label: "LTV / CAC", value: "6.2x" },
    { label: "NPS", value: "61" },
    { label: "AI तत्परता", value: "91/100" },
  ],
}

const SCENARIOS: AnalysisDataset["scenarios"] = {
  customerGrowth: [10, 20, 30, 40],
  cacReduction: [0, 10, 20, 30],
  retentionImprovement: [0, 5, 10, 15],
  defaults: { customerGrowth: 20, cacReduction: 10, retentionImprovement: 5 },
}

export const AAROHAN_DISCLAIMER: Record<AarohanOutputLanguage, string> = {
  en: "All figures, scores, competitors, and insights in this view are fictional and provided for hackathon demonstration only. They are not verified real-world data and were not produced by an AI model analyzing your document.",
  hi: "इस दृश्य के सभी आंकड़े, स्कोर, प्रतिद्वंद्वी और अंतर्दृष्टि काल्पनिक हैं और केवल हैकाथॉन प्रदर्शन के लिए दिए गए हैं। ये सत्यापित वास्तविक डेटा नहीं हैं और आपके दस्तावेज़ का AI मॉडल से विश्लेषण करके प्राप्त नहीं किए गए हैं।",
}

export const AAROHAN_STATUS: Record<AarohanOutputLanguage, string> = {
  en: "Demo Analysis Generated",
  hi: "डेमो विश्लेषण तैयार",
}

const AAROHAN_EXECUTIVE: Record<AarohanOutputLanguage, { summary: string; highlights: { opportunity: string; risk: string; priority: string } }> = {
  en: {
    summary: "Aarohan Commerce Technologies demonstrates healthy growth momentum supported by expanding digital commerce adoption, strong customer retention, improving margins, and increasing demand for AI-powered commerce tools. The strongest opportunities are customer expansion, AI-powered personalization, enterprise growth, and operational automation. Key risks include rising acquisition costs, increasing competition, and concentration in digital acquisition channels.",
    highlights: {
      opportunity: "AI-powered personalization and predictive analytics could become a major differentiator.",
      risk: "Customer acquisition costs are increasing faster than revenue efficiency.",
      priority: "Expand enterprise accounts while protecting retention.",
    },
  },
  hi: {
    summary: "आरोहण कॉमर्स टेक्नोलॉजीज डिजिटल कॉमर्स के बढ़ते उपयोग, मजबूत ग्राहक रिटेंशन, बेहतर मार्जिन और AI-संचालित कॉमर्स समाधानों की बढ़ती मांग के कारण अच्छी वृद्धि की स्थिति दर्शाती है। प्रमुख अवसरों में ग्राहक विस्तार, AI-संचालित पर्सनलाइज़ेशन, एंटरप्राइज़ विकास और परिचालन ऑटोमेशन शामिल हैं। प्रमुख जोखिमों में बढ़ती ग्राहक अधिग्रहण लागत, बढ़ती प्रतिस्पर्धा और डिजिटल अधिग्रहण चैनलों पर निर्भरता शामिल है।",
    highlights: {
      opportunity: "AI-संचालित पर्सनलाइज़ेशन और प्रेडिक्टिव एनालिटिक्स एक बड़ा भेदभेदक बन सकते हैं।",
      risk: "ग्राहक अधिग्रहण लागत राजस्व दक्षता की तुलना में तेज़ी से बढ़ रही है।",
      priority: "रिटेंशन सुरक्षित रखते हुए एंटरप्राइज़ खातों का विस्तार करें।",
    },
  },
}

const MARKET: Record<AarohanOutputLanguage, AnalysisDataset["market"]> = {
  en: {
    name: "Indian Retail Commerce Technology",
    tam: 12800,
    sam: 3600,
    som: 180,
    marketShare: 0.28,
    cagr: 16.2,
    attractiveness: 84,
    opportunity: "A focused enterprise and AI monetization strategy can move Aarohan from a broad SMB platform toward a higher-value, more predictable revenue mix.",
  },
  hi: {
    name: "भारतीय रिटेल कॉमर्स टेक्नोलॉजी",
    tam: 12800,
    sam: 3600,
    som: 180,
    marketShare: 0.28,
    cagr: 16.2,
    attractiveness: 84,
    opportunity: "केंद्रित एंटरप्राइज़ और AI मुनीकरण रणनीति आरोहण को व्यापक SMB प्लेटफ़ॉर्म से उच्च-मूल्य, अधिक पूर्वानुमेय राजस्व मिश्रण की ओर ले जा सकती है।",
  },
}

const COMPETITIVE_POSITION: Record<AarohanOutputLanguage, string> = {
  en: "Aarohan demonstrates strong analytics and AI capabilities, with the clearest remaining opportunity in enterprise penetration and international scale. Fictional peers · illustrative comparison.",
  hi: "आरोहण मजबूत एनालिटिक्स और AI क्षमताएं दर्शाता है, जबकि शेष सबसे स्पष्ट अवसर एंटरप्राइज़ पहुंच और अंतरराष्ट्रीय पैमाने में है। काल्पनिक प्रतिद्वंद्वी · उदाहरणात्मक तुलना।",
}

function build(language: AarohanOutputLanguage): AnalysisDataset {
  return {
    labels: language === "hi" ? HI_LABELS : EN_LABELS,
    status: AAROHAN_STATUS[language],
    disclaimer: AAROHAN_DISCLAIMER[language],
    company: language === "hi" ? COMPANY_HI : COMPANY_EN,
    health: { overall: 82, dimensions: HEALTH_DIMENSIONS[language] },
    executiveSummary: AAROHAN_EXECUTIVE[language].summary,
    executiveHighlights: AAROHAN_EXECUTIVE[language].highlights,
    financials: { years: FINANCIAL_YEARS, cac: 8400, ltv: 52100, ltvCac: 6.2 },
    customers: {
      total: 6850,
      active: 5420,
      enterprise: 3014,
      smb: 1507,
      monthlyActiveUsers: 98000,
      retention: 81,
      churn: 19,
      nps: 61,
      segments: SEGMENTS[language],
    },
    market: MARKET[language],
    competitors: COMPETITORS,
    competitivePosition: COMPETITIVE_POSITION[language],
    swot: SWOT[language],
    insights: INSIGHTS[language],
    recommendations: RECOMMENDATIONS[language],
    risks: RISKS[language],
    roadmap: ROADMAP[language],
    scenarios: SCENARIOS,
    kpis: KPIS[language],
    qa: QA[language],
  }
}

export const AAROHAN_BUSINESS_ANALYSIS: Record<AarohanOutputLanguage, AnalysisDataset> = {
  en: build("en"),
  hi: build("hi"),
}
