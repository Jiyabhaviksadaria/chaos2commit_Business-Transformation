export const DEMO_PROJECT_ID = "demo-project-intelly"

export type DemoHealthDimension = {
  label: string
  value: number
  tone: "positive" | "attention" | "neutral"
  /** Stable identifier so lookups survive label localization. */
  key?: string
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
  disclaimer: "All figures, scores, competitors, and insights in this view reflect Aarohan Commerce Technologies Pvt. Ltd. demonstration data.",
  company: {
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
    targetCustomers: [
      "D2C brands",
      "Small and medium retailers",
      "Online sellers",
      "Emerging consumer brands",
      "Enterprise commerce businesses",
    ],
    primaryProducts: [
      "Aarohan Commerce Cloud",
      "Aarohan Analytics",
      "Aarohan AI Recommendations",
      "Aarohan Seller Hub",
    ],
    description:
      "Aarohan Commerce Technologies Pvt. Ltd. is an Ahmedabad-based retail commerce and SaaS company founded in 2020. The company provides digital commerce solutions for D2C brands, small and medium retailers, online sellers, emerging consumer brands, and enterprise commerce businesses. Its product portfolio includes Aarohan Commerce Cloud, Aarohan Analytics, Aarohan AI Recommendations, and Aarohan Seller Hub.",
  },
  health: {
    overall: 81,
    dimensions: [
      { key: "marketPosition", label: "Market Position", value: 79, tone: "positive" },
      { key: "financialHealth", label: "Financial Health", value: 74, tone: "positive" },
      { key: "customerGrowth", label: "Customer Growth", value: 86, tone: "positive" },
      { key: "operationalEfficiency", label: "Operational Efficiency", value: 76, tone: "positive" },
      { key: "productStrength", label: "Product Strength", value: 88, tone: "positive" },
      { key: "competitivePosition", label: "Competitive Position", value: 72, tone: "attention" },
      { key: "innovationReadiness", label: "Innovation Readiness", value: 91, tone: "positive" },
    ] as DemoHealthDimension[],
  },
  executiveSummary:
    "Aarohan Commerce Technologies Pvt. Ltd. demonstrates strong revenue momentum of ₹36.4 Crore in 2025 with 28.6% growth, 61% gross margin, and 12% EBITDA margin across 6,850 total customers (5,420 active) and 98,000 monthly active users. Strategic focus areas center on enterprise adoption, retention improvement, CAC reduction, AI personalization monetization, multi-product adoption, strategic partnerships, and Tier-2 market expansion. Primary operational challenges include rising CAC, customer churn, increasing competition, platform dependency, limited enterprise penetration, and limited international presence.",
  executiveHighlights: {
    opportunity: "Expanding AI-powered personalization monetization, multi-product adoption, and enterprise adoption.",
    risk: "Rising customer acquisition costs (CAC), churn, and increasing competition.",
    priority: "Drive enterprise adoption and customer retention while developing strategic partnerships.",
  },
  financials: {
    years: [
      { year: "2023", revenue: 22.1, revenueGrowth: 0, grossMargin: 55, ebitdaMargin: 7 },
      { year: "2024", revenue: 28.3, revenueGrowth: 28.1, grossMargin: 58, ebitdaMargin: 10 },
      { year: "2025", revenue: 36.4, revenueGrowth: 28.6, grossMargin: 61, ebitdaMargin: 12 },
    ] as DemoFinancialYear[],
    cac: 7800,
    ltv: 52400,
    ltvCac: 6.7,
  },
  customers: {
    total: 6850,
    active: 5420,
    enterprise: 450,
    smb: 6400,
    monthlyActiveUsers: 98000,
    retention: 81,
    churn: 19,
    nps: 61,
    segments: [
      { name: "Enterprise", customers: 450, revenueContribution: 44, color: "#18181C" },
      { name: "Mid-Market", customers: 1650, revenueContribution: 34, color: "#8B5CF6" },
      { name: "SMB", customers: 4750, revenueContribution: 22, color: "#B8DF9E" },
    ] as DemoCustomerSegment[],
  },
  market: {
    name: "Indian Retail Commerce & SaaS",
    tam: 18500,
    sam: 4800,
    som: 240,
    marketShare: 0.28,
    cagr: 18.4,
    attractiveness: 84,
    opportunity: "Increasing enterprise adoption, strategic partnerships, multi-product adoption, and AI monetization present major growth avenues for Aarohan.",
  },
  competitors: [
    { name: "Aarohan", color: "#18181C", scores: { product: 88, ai: 91, pricing: 76, analytics: 86, enterprise: 74, experience: 83, scalability: 81 } },
    { name: "CommerceSphere", color: "#8B5CF6", scores: { product: 80, ai: 74, pricing: 72, analytics: 76, enterprise: 82, experience: 79, scalability: 84 } },
    { name: "RetailFlow", color: "#F59E0B", scores: { product: 76, ai: 68, pricing: 84, analytics: 70, enterprise: 66, experience: 74, scalability: 72 } },
    { name: "MarketGrid", color: "#10B981", scores: { product: 74, ai: 78, pricing: 78, analytics: 66, enterprise: 62, experience: 84, scalability: 68 } },
  ] as DemoCompetitor[],
  competitivePosition: "Aarohan Commerce Technologies leads in AI recommendations and retail analytics, with clear strategic potential in enterprise penetration.",
  swot: {
    strengths: [
      "High 81% customer retention rate & NPS of 61",
      "Comprehensive product suite (Commerce Cloud, Analytics, AI Recommendations, Seller Hub)",
      "Strong financial growth (₹36.4 Cr revenue in 2025, 61% gross margin, 12% EBITDA margin)",
      "Established base of 6,850 total customers (5,420 active) & 98,000 monthly active users",
      "Proven B2C + B2B SaaS business model",
    ],
    weaknesses: [
      "Rising customer acquisition costs (CAC)",
      "Customer churn in SMB segments",
      "Limited enterprise penetration",
      "Limited international presence",
      "Platform dependency on digital acquisition channels",
    ],
    opportunities: [
      "Increasing enterprise adoption and higher-value contracts",
      "Expanding AI-powered personalization and monetization",
      "Increasing multi-product adoption across active customers",
      "Developing strategic partnerships to lower CAC",
      "Expansion into Tier-2 markets in India",
    ],
    threats: [
      "Increasing competition from retail commerce SaaS platforms",
      "Rising digital customer acquisition costs",
      "Platform dependency",
      "Customer churn due to market pressures",
    ],
  },
  insights: [
    { id: "retention-opportunity", title: "Retention & Multi-Product Adoption", body: "With an 81% retention rate and 98,000 MAUs, encouraging customers to adopt multiple Aarohan products (Cloud, Analytics, AI Recommendations, Seller Hub) significantly improves customer lifetime value.", impact: "High", confidence: "High", priority: "Critical", action: "Launch a multi-product onboarding program guiding customers into 2+ modules within the first 90 days." },
    { id: "enterprise-adoption", title: "Enterprise Adoption Motion", body: "Increasing enterprise adoption offers higher ARPU and long-term contract stability, directly mitigating SMB customer churn.", impact: "High", confidence: "High", priority: "High", action: "Build an enterprise sales playbook with custom integrations and dedicated customer success managers." },
    { id: "ai-monetization", title: "AI-Powered Personalization Monetization", body: "Aarohan AI Recommendations and Analytics provide clear revenue lift for sellers, making them prime candidates for premium usage tiers.", impact: "High", confidence: "High", priority: "High", action: "Introduce tiered pricing for Aarohan AI Recommendations based on conversion lift and recommendation volume." },
    { id: "cac-reduction", title: "CAC Reduction & Strategic Partnerships", body: "Rising CAC is a key challenge; developing strategic partnerships and referral channels can lower acquisition costs.", impact: "High", confidence: "Medium", priority: "Critical", action: "Establish agency and reseller partner programs with shared revenue incentives." },
    { id: "tier2-expansion", title: "Tier-2 Market Penetration", body: "Retailers in Tier-2 Indian markets represent a large underserved market for Aarohan Seller Hub and Commerce Cloud.", impact: "Medium", confidence: "High", priority: "Medium", action: "Develop localized onboarding and regional partner enablement in key Tier-2 commerce hubs." },
  ] as DemoInsight[],
  recommendations: [
    { id: "enterprise-program", title: "Launch Enterprise Adoption Program", impact: "High", effort: "Medium", priority: "Critical", outcome: "Increase enterprise revenue contribution and improve ARPU.", quadrant: "high-medium" },
    { id: "ai-monetization-rec", title: "Monetize AI Personalization & Recommendations", impact: "High", effort: "Low", priority: "High", outcome: "Boost gross margins and ARPU through AI feature tiers.", quadrant: "high-low" },
    { id: "multi-product-rec", title: "Drive Multi-Product Cross-Selling", impact: "High", effort: "Low", priority: "High", outcome: "Improve customer retention beyond 81% and reduce churn.", quadrant: "high-low" },
    { id: "partner-network", title: "Develop Strategic Partnerships to Reduce CAC", impact: "Medium–High", effort: "Medium", priority: "High", outcome: "Lower rising customer acquisition costs (CAC).", quadrant: "medium-medium" },
    { id: "tier2-expansion-rec", title: "Expand into Tier-2 Regional Retail Markets", impact: "Medium", effort: "High", priority: "Medium", outcome: "Tap into rapidly growing regional retail brands in India.", quadrant: "medium-high" },
  ] as DemoRecommendation[],
  risks: [
    { risk: "Rising CAC", probability: "High", impact: "High", severity: "Critical", mitigation: "Develop strategic partnerships and referral channels to lower customer acquisition cost." },
    { risk: "Customer Churn", probability: "Medium", impact: "High", severity: "High", mitigation: "Deploy proactive health monitoring, multi-product onboarding, and automated customer success alerts." },
    { risk: "Increasing Competition", probability: "High", impact: "Medium", severity: "High", mitigation: "Differentiate through Aarohan AI Recommendations, deep analytics, and tailored regional support." },
    { risk: "Platform Dependency", probability: "Medium", impact: "High", severity: "High", mitigation: "Diversify client acquisition and build open API connectors for major e-commerce ecosystems." },
    { risk: "Limited Enterprise Penetration", probability: "Medium", impact: "Medium", severity: "Moderate", mitigation: "Invest in enterprise-grade security, SLA guarantees, and custom ERP/CRM integrations." },
    { risk: "Limited International Presence", probability: "Low", impact: "Medium", severity: "Moderate", mitigation: "Focus on mastering India's D2C and retail market before expanding cross-border." },
  ] as DemoRisk[],
  roadmap: [
    { quarter: "Q1", theme: "Enterprise & AI Focus", items: ["Monetize Aarohan AI Recommendations", "Launch Enterprise Adoption Playbook", "Improve retention tracking"] },
    { quarter: "Q2", theme: "Multi-Product & Partnerships", items: ["Drive cross-sell across Commerce Cloud & Analytics", "Establish Strategic Partner Network", "Reduce CAC through partner leads"] },
    { quarter: "Q3", theme: "Tier-2 Expansion", items: ["Roll out localized onboarding for Tier-2 markets", "Enhance Aarohan Seller Hub capabilities"] },
    { quarter: "Q4", theme: "Scale & Retention", items: ["Evaluate initial international opportunities", "Scale enterprise success teams"] },
  ],
  scenarios: {
    customerGrowth: [10, 20, 30, 40],
    cacReduction: [0, 10, 20, 30],
    retentionImprovement: [0, 5, 10, 15],
    defaults: { customerGrowth: 20, cacReduction: 10, retentionImprovement: 5 },
  },
  qa: [
    { question: "What is Aarohan's financial performance in 2025?", answer: "Aarohan Commerce Technologies generated ₹36.4 Crore in revenue in 2025 with 28.6% revenue growth, a 61% gross margin, and a 12% EBITDA margin." },
    { question: "Who are Aarohan's target customers and active user base?", answer: "Aarohan serves ~6,850 total customers (5,420 active customers) with 98,000 monthly active users (MAUs). Its target customers include D2C brands, small and medium retailers, online sellers, emerging consumer brands, and enterprise commerce businesses." },
    { question: "What are Aarohan's primary products?", answer: "Aarohan's product portfolio includes Aarohan Commerce Cloud, Aarohan Analytics, Aarohan AI Recommendations, and Aarohan Seller Hub." },
    { question: "What are the company's major strategic priorities?", answer: "Aarohan is focused on increasing enterprise adoption, improving customer retention, reducing customer acquisition costs (CAC), expanding AI-powered personalization and monetization, increasing multi-product adoption, developing strategic partnerships, and entering Tier-2 markets." },
    { question: "What key challenges does Aarohan face?", answer: "Aarohan's major challenges include rising customer acquisition costs (CAC), customer churn, increasing competition, platform dependency, limited enterprise penetration, and limited international presence." },
    { question: "How strong is Aarohan's customer retention?", answer: "Aarohan maintains an impressive 81% customer retention rate with a Net Promoter Score (NPS) of 61." },
  ] as DemoQA[],
} as const

export type DemoBusinessData = typeof demoBusinessData
