import { describe, expect, it } from "vitest"

import {
  AAROHAN_BUSINESS_ANALYSIS,
  AAROHAN_OUTPUT_LANGUAGES,
  normalizeOutputLanguage,
  type AarohanOutputLanguage,
} from "@/data/aarohan-business-analysis"
import {
  detectInputLanguage,
  normalizeDocumentText,
  recognizeDemoDocument,
  unrecognizedMessageFor,
} from "@/lib/demo-document-recognition"

const GUJARATI_PDF_TEXT = `
આરોહણ કોમર્સ ટેકનોલોજીસ પ્રાઇવેટ લિમિટેડ
અહમદાબાદ, ગુજરાત, ભારત
2020 માં સ્થાપના
વાર્ષિક આવક: 36.4 Crore
ગ્રાહકો: 6,850
કર્મચારીઓ: 142
સકલ માર્જિન: 61%
રિટેન્શન: 81%
NPS: 61
`

const HINDI_PDF_TEXT = `
आरोहण कॉमर्स टेक्नोलॉजीज प्रा. लि.
अहमदाबाद, गुजरात, भारत
स्थापना 2020
वार्षिक आय: 36.4 Crore
ग्राहक: 6,850
कर्मचारी: 142
सकल मार्जिन: 61%
रिटेंशन: 81%
NPS: 61
`

const UNRELATED_PDF_TEXT = `
Bluepeak Logistics Private Limited
Pune, Maharashtra, India
Founded 2011
Annual revenue 12.2 Crore
Total customers 940
`

describe("Aarohan demo dataset", () => {
  it("exposes exactly English and Hindi output languages", () => {
    expect(AAROHAN_OUTPUT_LANGUAGES).toEqual(["en", "hi"])
    expect(normalizeOutputLanguage("hi")).toBe("hi")
    expect(normalizeOutputLanguage("en")).toBe("en")
    expect(normalizeOutputLanguage("gu")).toBe("en")
    expect(normalizeOutputLanguage(undefined)).toBe("en")
  })

  it("carries the specified Aarohan company facts", () => {
    const { company, health, customers, market, financials } = AAROHAN_BUSINESS_ANALYSIS.en
    expect(company.name).toBe("Aarohan Commerce Technologies Pvt. Ltd.")
    expect(company.industry).toBe("Retail Commerce & SaaS")
    expect(company.headquarters).toBe("Ahmedabad, Gujarat, India")
    expect(company.founded).toBe("2020")
    expect(company.employees).toBe(142)
    expect(company.annualGrowth).toBe("28.6%")
    expect(health.overall).toBe(82)
    expect(customers.total).toBe(6850)
    expect(customers.active).toBe(5420)
    expect(customers.monthlyActiveUsers).toBe(98000)
    expect(customers.nps).toBe(61)
    expect(customers.retention).toBe(81)
    expect(customers.churn).toBe(19)
    expect(market.tam).toBe(12800)
    expect(market.sam).toBe(3600)
    expect(market.som).toBe(180)
    expect(market.marketShare).toBe(0.28)
    expect(market.cagr).toBe(16.2)
    expect(financials.years.map((y) => y.revenue)).toEqual([22.1, 28.3, 36.4])
    expect(financials.years.map((y) => y.grossMargin)).toEqual([55, 58, 61])
    expect(financials.years.map((y) => y.ebitdaMargin)).toEqual([7, 10, 12])
    expect(financials.ltvCac).toBe(6.2)
  })

  it("keeps the seven health categories identical across languages by key", () => {
    const en = AAROHAN_BUSINESS_ANALYSIS.en.health.dimensions
    const hi = AAROHAN_BUSINESS_ANALYSIS.hi.health.dimensions
    expect(en.map((d) => [d.key, d.value, d.tone])).toEqual(hi.map((d) => [d.key, d.value, d.tone]))
    expect(en.map((d) => d.value)).toEqual([79, 74, 86, 76, 88, 72, 91])
  })

  it("is fully translated in Hindi but keeps numbers, brand and URLs", () => {
    const en = AAROHAN_BUSINESS_ANALYSIS.en
    const hi = AAROHAN_BUSINESS_ANALYSIS.hi

    // Translated narrative content.
    expect(hi.executiveSummary).not.toBe(en.executiveSummary)
    expect(hi.executiveSummary).toMatch(/[\u0900-\u097F]/)
    expect(hi.labels.swotAnalysis).toBe("SWOT विश्लेषण")
    expect(hi.labels.executiveSummary).toBe("व्यावसायिक सारांश")
    expect(hi.labels.kpis).toBe("मुख्य प्रदर्शन संकेतक")
    expect(hi.labels.businessRisks).toBe("व्यावसायिक जोखिम")
    expect(hi.labels.exploreScenarios).toBe("रणनीतिक परिदृश्य देखें")

    // Not translated: brand, website, numbers, product proper names.
    expect(hi.company.website).toBe(en.company.website)
    expect(hi.company.employees).toBe(en.company.employees)
    expect(hi.financials.years.map((y) => y.revenue)).toEqual(en.financials.years.map((y) => y.revenue))
    expect(hi.competitors[0].name).toBe("Aarohan")
    expect(hi.competitors.map((c) => c.scores)).toEqual(en.competitors.map((c) => c.scores))
    expect(hi.market.tam).toBe(en.market.tam)
    expect(hi.customers.total).toBe(en.customers.total)
  })

  it("keeps the same structure and lengths in both languages", () => {
    const en = AAROHAN_BUSINESS_ANALYSIS.en
    const hi = AAROHAN_BUSINESS_ANALYSIS.hi
    expect(hi.insights).toHaveLength(en.insights.length)
    expect(hi.recommendations).toHaveLength(en.recommendations.length)
    expect(hi.risks).toHaveLength(en.risks.length)
    expect(hi.roadmap).toHaveLength(en.roadmap.length)
    expect(hi.qa).toHaveLength(en.qa.length)
    expect(hi.kpis).toHaveLength(en.kpis.length)
    expect(hi.swot.strengths).toHaveLength(en.swot.strengths.length)
    expect(hi.swot.threats).toHaveLength(en.swot.threats.length)
    expect(hi.recommendations.map((r) => r.quadrant)).toEqual(
      en.recommendations.map((r) => r.quadrant),
    )
  })

  it("never claims an AI model analyzed the document", () => {
    for (const language of AAROHAN_OUTPUT_LANGUAGES) {
      const data = AAROHAN_BUSINESS_ANALYSIS[language]
      expect(data.status).toMatch(/Demo Analysis Generated|डेमो विश्लेषण तैयार/)
      expect(data.disclaimer).toMatch(
        language === "hi" ? /काल्पनिक हैं/ : /fictional and provided for hackathon demonstration/,
      )
      expect(data.labels.askAiSubtitle).toBe(
        language === "hi"
          ? "एक स्थानीय, तत्काल डेमो बातचीत। कोई बाहरी AI अनुरोध नहीं किया जाता।"
          : "A local, instant demo conversation. No external AI request is made.",
      )
    }
  })
})

describe("deterministic document recognition", () => {
  it("recognizes a Gujarati document", () => {
    const result = recognizeDemoDocument(GUJARATI_PDF_TEXT)
    expect(result.recognized).toBe(true)
    expect(result.demoCompany).toBe("aarohan")
    expect(result.inputLanguage).toBe("gu")
    expect(result.matchedSignals.length).toBeGreaterThanOrEqual(3)
  })

  it("recognizes a Hindi document", () => {
    const result = recognizeDemoDocument(HINDI_PDF_TEXT)
    expect(result.recognized).toBe(true)
    expect(result.demoCompany).toBe("aarohan")
    expect(result.inputLanguage).toBe("hi")
  })

  it("recognizes an English document", () => {
    const result = recognizeDemoDocument(
      "Aarohan Commerce Technologies Pvt. Ltd. Ahmedabad 2020 revenue 36.4 Cr customers 6,850 margin 61% retention 81%",
    )
    expect(result.recognized).toBe(true)
    expect(result.inputLanguage).toBe("en")
  })

  it("is robust to whitespace, punctuation and case", () => {
    const messy = "  AAROHAN   COMMERCE,  TECHNOLOGIES!!!  ahmedabad  2020  36.4  crore  6,850  61%  81%  "
    expect(recognizeDemoDocument(messy).recognized).toBe(true)
  })

  it("rejects an unrelated company document", () => {
    const result = recognizeDemoDocument(UNRELATED_PDF_TEXT)
    expect(result.recognized).toBe(false)
    expect(result.demoCompany).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it("does not match on business facts alone", () => {
    const noName = "Ahmedabad 2020 36.4 Crore 6,850 customers 61% gross margin 81% retention"
    expect(recognizeDemoDocument(noName).recognized).toBe(false)
  })

  it("returns the exact required unrecognized message in both languages", () => {
    expect(unrecognizedMessageFor("en")).toBe("This document is not recognized as the Aarohan demo dataset.")
    expect(unrecognizedMessageFor("hi")).toBe("यह दस्तावेज़ आरोहण डेमो डेटासेट के रूप में पहचाना नहीं गया।")
  })

  it("handles empty input without throwing", () => {
    const result = recognizeDemoDocument("")
    expect(result.recognized).toBe(false)
    expect(result.inputLanguage).toBe("unknown")
  })

  it("normalizes text and detects script", () => {
    expect(normalizeDocumentText("  Aarohan   Commerce  ")).toBe("aarohan commerce")
    expect(detectInputLanguage("Aarohan Commerce")).toBe("en")
    expect(detectInputLanguage("आरोहण कॉमर्स")).toBe("hi")
    expect(detectInputLanguage("આરોહણ કોમર્સ")).toBe("gu")
    expect(detectInputLanguage("आरोहण આરોહણ")).toBe("mixed")
  })
})

/** The four required input-document x output-language combinations. */
describe("four document / output-language combinations", () => {
  const cases: Array<{ name: string; document: string; expectedInput: string; output: AarohanOutputLanguage }> = [
    { name: "Gujarati PDF -> English output", document: GUJARATI_PDF_TEXT, expectedInput: "gu", output: "en" },
    { name: "Gujarati PDF -> Hindi output", document: GUJARATI_PDF_TEXT, expectedInput: "gu", output: "hi" },
    { name: "Hindi PDF -> English output", document: HINDI_PDF_TEXT, expectedInput: "hi", output: "en" },
    { name: "Hindi PDF -> Hindi output", document: HINDI_PDF_TEXT, expectedInput: "hi", output: "hi" },
  ]

  for (const testCase of cases) {
    it(`${testCase.name} yields the Aarohan analysis in ${testCase.output}`, () => {
      const recognition = recognizeDemoDocument(testCase.document)
      expect(recognition.recognized).toBe(true)
      expect(recognition.inputLanguage).toBe(testCase.expectedInput)

      // The document only selects the dataset; output language is independent.
      const analysis = AAROHAN_BUSINESS_ANALYSIS[testCase.output]
      expect(analysis.company.name).toBe("Aarohan Commerce Technologies Pvt. Ltd.")
      expect(analysis.labels.executiveSummary).toBe(
        testCase.output === "hi" ? "व्यावसायिक सारांश" : "Executive Summary",
      )
      // Recognition is language-independent of the output choice.
      expect(AAROHAN_BUSINESS_ANALYSIS.en.company.name).toBe(
        AAROHAN_BUSINESS_ANALYSIS.hi.company.name,
      )
    })
  }

  it("unknown document never yields the Aarohan analysis", () => {
    const recognition = recognizeDemoDocument(UNRELATED_PDF_TEXT)
    expect(recognition.recognized).toBe(false)
    // The caller must not resolve a dataset for an unrecognized document.
    expect(recognition.demoCompany).toBeNull()
  })
})
