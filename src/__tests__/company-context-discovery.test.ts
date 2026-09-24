import { describe, expect, it } from "vitest"
import { companyContextSchema, formatCompanyContext } from "@/lib/company-context"
import { assessDiscoveryState, buildReadinessAssessment, emptyUnderstanding } from "@/lib/ai/discovery"

describe("structured INTELLY company context", () => {
  it("accepts structured intake and formats it for AI context", () => {
    const parsed = companyContextSchema.parse({
      companyName: "ABC Retail",
      companyWebsite: "https://abc.example",
      industry: "Retail",
      companySize: "201–1,000 employees",
      userRole: "Operations Manager",
      currentTools: ["Legacy POS", "Excel"],
      businessObjective: "Modernize inventory operations",
    })
    const formatted = formatCompanyContext(parsed)
    expect(formatted).toContain("Company Name: ABC Retail")
    expect(formatted).toContain("Current Tools / Systems: Legacy POS, Excel")
    expect(formatted).toContain("Primary Business Objective: Modernize inventory operations")
  })

  it("requires structured fields for new projects", () => {
    const result = companyContextSchema.safeParse({ companyName: "Only a name" })
    expect(result.success).toBe(false)
  })
})

describe("adaptive discovery state", () => {
  it("does not claim readiness before process, impact, and evidence are known", () => {
    const state = assessDiscoveryState({
      answers: [{ question: "What is the objective?", answer: "Reduce operational cost" }],
      businessContent: "Company objective: reduce operational cost",
      metadata: { companyContext: { businessObjective: "Reduce operational cost" } },
      sourceCount: 0,
    })
    expect(state.readyForAnalysis).toBe(false)
    expect(state.status).toBe("IN_PROGRESS")
  })

  it("marks readiness only when evidence dimensions are covered", () => {
    const understanding = {
      ...emptyUnderstanding(),
      currentProcess: ["POS sale is manually copied into Excel at end of day"],
      observedProblems: [{ id: "p1", title: "Inventory discrepancies", description: "Stock differs", status: "CONFIRMED" as const, confidence: 90, evidenceIds: ["e1"] }],
      businessImpact: ["Lost sales", "Customer dissatisfaction"],
      constraints: ["Must preserve the legacy POS during migration"],
      evidence: [{ id: "e1", statement: "The team updates Excel manually", source: "USER", sourceType: "USER" as const, status: "CONFIRMED" as const, confidence: 90 }],
    }
    const state = assessDiscoveryState({
      answers: [
        { question: "Process?", answer: "Manual end-of-day Excel update" },
        { question: "Problem?", answer: "Inventory discrepancies occur" },
        { question: "Impact?", answer: "Lost sales" },
      ],
      businessContent: "Objective: modernize inventory. Process: manual POS to Excel. Problem: discrepancies. Impact: lost sales. Constraints: preserve legacy POS.",
      metadata: { companyContext: { businessObjective: "Modernize inventory" } },
      sourceCount: 1,
    })
    const assessment = buildReadinessAssessment({ ...state, understanding }, "Objective and evidence are present", { companyContext: { businessObjective: "Modernize inventory" } })
    expect(state.readyForAnalysis).toBe(true)
    expect(assessment.evidenceBased).toBe(true)
    expect(assessment.status).toBe("INSUFFICIENT_INFORMATION")
    expect(assessment.overallScore).toBeNull()
  })
})
