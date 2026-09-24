export const DEMO_PROJECT_ID = "demo-project-intelly"

export type DemoHealthDimension = {
  label: string
  value: number
  tone: "positive" | "attention" | "neutral"
}

export type DemoFinancialYear = {
  year: string
  revenue: number
  revenueGrowth: number
  grossMargin: number
  ebitdaMargin: number
}

export type DemoCustomerSegment = {
  name: string
  customers: number
  revenueContribution: number
  color: string
}

export type DemoCompetitor = {
  name: string
  color: string
  scores: {
    product: number
    ai: number
    pricing: number
    analytics: number
    enterprise: number
    experience: number
    scalability: number
  }
}

export type DemoInsight = {
  id: string
  title: string
  body: string
  impact: "High" | "Medium" | "Low"
  confidence: "High" | "Medium" | "Low"
  priority: "Critical" | "High" | "Medium" | "Low"
  action: string
}

export type DemoRecommendation = {
  id: string
  title: string
  impact: "High" | "Medium–High" | "Medium"
  effort: "Low" | "Medium" | "High"
  priority: "Critical" | "High" | "Medium"
  outcome: string
  quadrant: "high-low" | "high-medium" | "medium-medium" | "medium-high"
}

export type DemoRisk = {
  risk: string
  probability: "High" | "Medium" | "Low"
  impact: "High" | "Medium" | "Low"
  severity: "Critical" | "High" | "Moderate"
  mitigation: string
}

export type DemoQA = {
  question: string
  answer: string
}

export const demoBusinessData = {
  status: "Illustrative Demo Data",
  disclaimer: "All figures, scores, competitors, and insights in this view are fictional and provided for product demonstration only. They are not verified real-world data.",
  company: {
    name: "NovaCart Technologies Pvt. Ltd.",
    industry: "E-commerce & Retail Technology",
    companyType: "Private Limited",
    founded: "2021",
    headquarters: "Bengaluru, Karnataka, India",
    website: "https://www.novacart.example",
    employees: 186,
    annualRevenue: "₹42.8 Crore",
    annualGrowth: "31.6%",
    primaryMarket: "India",
    businessModel: "B2C + B2B SaaS",
    targetCustomers: ["D2C brands", "Small and medium retailers", "Online sellers", "Emerging consumer brands"],
    primaryProducts: ["NovaCart Commerce Platform", "NovaCart Analytics", "NovaCart AI Recommendations", "NovaCart Seller Intelligence"],
    description: "NovaCart Technologies Pvt. Ltd. is an Indian retail technology company helping emerging brands and retailers manage digital commerce, customer engagement, analytics, and AI-powered personalization from a unified platform. NovaCart combines storefront infrastructure, customer analytics, recommendation intelligence, and seller insights to help businesses increase conversion, improve retention, and make faster data-driven decisions.",
  },
  health: {
    overall: 78,
    dimensions: [
      { label: "Market Position", value: 82, tone: "positive" },
      { label: "Financial Health", value: 76, tone: "positive" },
      { label: "Customer Growth", value: 84, tone: "positive" },
      { label: "Operational Efficiency", value: 71, tone: "attention" },
      { label: "Product Strength", value: 86, tone: "positive" },
      { label: "Competitive Position", value: 74, tone: "attention" },
      { label: "Innovation Readiness", value: 88, tone: "positive" },
    ] as DemoHealthDimension[],
  },
  executiveSummary: "NovaCart demonstrates strong growth momentum supported by increasing customer adoption, improving product capabilities, and growing demand for AI-powered commerce tools. The strongest opportunities are customer retention, enterprise expansion, AI monetization, and operational automation. The primary risks are rising customer acquisition costs, increasing competition, and dependence on a limited number of acquisition channels.",
  executiveHighlights: {
    opportunity: "AI-powered personalization and predictive analytics could become a major differentiator.",
    risk: "Customer acquisition costs are increasing faster than revenue efficiency.",
    priority: "Improve retention while expanding high-value B2B accounts.",
  },
  financials: {
    years: [
      { year: "2023", revenue: 24.6, revenueGrowth: 0, grossMargin: 58, ebitdaMargin: 8 },
      { year: "2024", revenue: 32.5, revenueGrowth: 32.1, grossMargin: 61, ebitdaMargin: 11 },
      { year: "2025", revenue: 42.8, revenueGrowth: 31.7, grossMargin: 64, ebitdaMargin: 14 },
    ] as DemoFinancialYear[],
    cac: 8400,
    ltv: 54700,
    ltvCac: 6.5,
  },
  customers: {
    total: 8420,
    active: 6970,
    enterprise: 312,
    smb: 8108,
    monthlyActiveUsers: 124000,
    retention: 78,
    churn: 22,
    nps: 54,
    segments: [
      { name: "Enterprise", customers: 312, revenueContribution: 48, color: "#18181C" },
      { name: "Mid-Market", customers: 1420, revenueContribution: 31, color: "#8B5CF6" },
      { name: "SMB", customers: 6688, revenueContribution: 21, color: "#B8DF9E" },
    ] as DemoCustomerSegment[],
  },
  market: {
    name: "Indian E-commerce Technology",
    tam: 18500,
    sam: 4800,
    som: 240,
    marketShare: 0.23,
    cagr: 18.4,
    attractiveness: 82,
    opportunity: "A focused enterprise and AI monetization strategy can move NovaCart from a broad SMB platform toward a higher-value, more predictable revenue mix.",
  },
  competitors: [
    { name: "NovaCart", color: "#18181C", scores: { product: 86, ai: 92, pricing: 78, analytics: 88, enterprise: 72, experience: 82, scalability: 80 } },
    { name: "ShopSphere", color: "#8B5CF6", scores: { product: 82, ai: 74, pricing: 70, analytics: 76, enterprise: 84, experience: 80, scalability: 86 } },
    { name: "RetailFlow", color: "#F59E0B", scores: { product: 78, ai: 68, pricing: 86, analytics: 70, enterprise: 66, experience: 74, scalability: 72 } },
    { name: "CommercePilot", color: "#10B981", scores: { product: 74, ai: 80, pricing: 80, analytics: 66, enterprise: 62, experience: 86, scalability: 68 } },
    { name: "MarketGrid", color: "#64748B", scores: { product: 70, ai: 62, pricing: 66, analytics: 84, enterprise: 88, experience: 68, scalability: 90 } },
  ] as DemoCompetitor[],
  competitivePosition: "NovaCart demonstrates strong AI and analytics capabilities while having opportunities to strengthen enterprise penetration and brand recognition.",
  swot: {
    strengths: ["Strong AI capabilities", "Growing customer base", "High product adoption", "Improving margins", "Unified analytics platform"],
    weaknesses: ["Relatively low enterprise penetration", "Dependence on digital acquisition", "Limited international presence", "Small sales organization"],
    opportunities: ["Enterprise expansion", "AI-powered personalization", "International expansion", "Strategic partnerships", "Embedded finance", "Predictive customer analytics"],
    threats: ["Increasing competition", "Rising CAC", "Platform dependency", "Rapid technology changes", "Customer churn"],
  },
  insights: [
    { id: "retention-opportunity", title: "Retention Opportunity", body: "Customers using three or more NovaCart modules show stronger retention than single-module customers. Increasing multi-product adoption could improve customer lifetime value.", impact: "High", confidence: "High", priority: "Critical", action: "Launch an adoption program that guides new customers into a second and third module within the first 90 days." },
    { id: "enterprise-opportunity", title: "Enterprise Opportunity", body: "Enterprise customers contribute a disproportionate share of revenue, indicating potential for a focused enterprise expansion strategy.", impact: "High", confidence: "High", priority: "High", action: "Build an enterprise sales motion with segment-specific integrations, service levels, and proof-of-value packages." },
    { id: "margin-opportunity", title: "Margin Opportunity", body: "Gross margins have improved consistently, suggesting increasing operating leverage and stronger platform economics.", impact: "High", confidence: "High", priority: "High", action: "Protect infrastructure efficiency while investing selectively in high-retention product capabilities." },
    { id: "acquisition-risk", title: "Acquisition Risk", body: "Customer acquisition costs are rising, creating pressure on growth efficiency. Referral and partner-led acquisition should be evaluated.", impact: "High", confidence: "Medium", priority: "Critical", action: "Test referral economics and establish a partner acquisition channel with measurable payback periods." },
    { id: "ai-monetization", title: "AI Monetization", body: "AI-powered recommendation and analytics features represent an opportunity to introduce premium pricing tiers.", impact: "High", confidence: "Medium", priority: "High", action: "Package AI recommendations and predictive analytics as a premium tier with usage-based expansion." },
  ] as DemoInsight[],
  recommendations: [
    { id: "enterprise-growth", title: "Launch an Enterprise Growth Program", impact: "High", effort: "Medium", priority: "Critical", outcome: "Increase enterprise revenue contribution and improve revenue predictability.", quadrant: "high-medium" },
    { id: "ai-premium", title: "Introduce AI Premium Tier", impact: "High", effort: "Medium", priority: "High", outcome: "Increase ARPU through AI-powered analytics and personalization.", quadrant: "high-medium" },
    { id: "partner-acquisition", title: "Build Partner Acquisition Channel", impact: "Medium–High", effort: "Medium", priority: "High", outcome: "Reduce dependency on paid acquisition.", quadrant: "medium-medium" },
    { id: "multi-product", title: "Increase Multi-Product Adoption", impact: "High", effort: "Low", priority: "High", outcome: "Improve retention and customer lifetime value.", quadrant: "high-low" },
    { id: "tier-two", title: "Expand into Tier-2 Markets", impact: "Medium", effort: "High", priority: "Medium", outcome: "Increase addressable market and customer acquisition opportunities.", quadrant: "medium-high" },
  ] as DemoRecommendation[],
  risks: [
    { risk: "Rising CAC", probability: "High", impact: "High", severity: "Critical", mitigation: "Shift budget toward referral, partner, and product-led acquisition; monitor payback by channel." },
    { risk: "Customer Churn", probability: "Medium", impact: "High", severity: "High", mitigation: "Use module-adoption cohorts, proactive health scores, and customer-success playbooks." },
    { risk: "Competition", probability: "High", impact: "Medium", severity: "High", mitigation: "Differentiate through AI outcomes, integration depth, and measurable time-to-value." },
    { risk: "Platform Dependency", probability: "Medium", impact: "High", severity: "High", mitigation: "Reduce dependence on any single acquisition platform through owned lifecycle channels." },
    { risk: "International Expansion", probability: "Medium", impact: "Medium", severity: "Moderate", mitigation: "Validate localization, compliance, and partner economics before committing to a full rollout." },
  ] as DemoRisk[],
  roadmap: [
    { quarter: "Q1", theme: "Retain and monetize", items: ["Launch AI Premium Tier", "Improve customer retention analytics", "Build enterprise sales pipeline"] },
    { quarter: "Q2", theme: "Scale distribution", items: ["Launch partner program", "Improve recommendation engine", "Expand enterprise integrations"] },
    { quarter: "Q3", theme: "Expand the market", items: ["Enter selected Tier-2 markets", "Launch advanced predictive analytics"] },
    { quarter: "Q4", theme: "Extend the platform", items: ["Evaluate international expansion", "Expand AI product portfolio"] },
  ],
  scenarios: {
    customerGrowth: [10, 20, 30, 40],
    cacReduction: [0, 10, 20, 30],
    retentionImprovement: [0, 5, 10, 15],
    defaults: { customerGrowth: 20, cacReduction: 10, retentionImprovement: 5 },
  },
  qa: [
    { question: "What is the biggest growth opportunity?", answer: "The biggest growth opportunity is a focused enterprise expansion program. Enterprise customers already contribute 48% of revenue from only 312 accounts, so improving enterprise penetration can raise revenue predictability without requiring proportionate growth in the long-tail SMB base." },
    { question: "What are the biggest risks?", answer: "The most important risks are rising customer acquisition cost, churn, and platform dependency. NovaCart should protect retention, diversify acquisition channels, and measure payback by channel before scaling spend." },
    { question: "How can NovaCart improve profitability?", answer: "NovaCart can improve profitability by increasing multi-product adoption, protecting infrastructure leverage, and monetizing AI capabilities through a premium tier. These moves support higher ARPU without relying only on acquisition volume." },
    { question: "Which customer segment should be prioritized?", answer: "Enterprise should be the strategic priority, while SMB remains an important adoption and expansion base. A focused enterprise motion offers the strongest revenue concentration opportunity, supported by integrations and service-level packaging." },
    { question: "How can AI increase revenue?", answer: "AI can increase revenue through premium recommendations, predictive customer analytics, personalization, and seller intelligence. The best path is to tie each AI feature to a measurable conversion, retention, or ARPU outcome." },
    { question: "What should management focus on next quarter?", answer: "Management should focus on launching the AI Premium Tier, improving retention analytics, and building the enterprise sales pipeline. These actions balance near-term monetization with the company’s largest structural growth opportunity." },
  ] as DemoQA[],
} as const

export type DemoBusinessData = typeof demoBusinessData
