import { describe, expect, it } from "vitest"
import { demoBusinessData, DEMO_PROJECT_ID } from "@/lib/demo-business-data"

describe("Aarohan Commerce demo business data", () => {
  it("keeps the demo dataset deterministic and complete", () => {
    expect(demoBusinessData.company.name).toBe("Aarohan Commerce Technologies Pvt. Ltd.")
    expect(demoBusinessData.health.overall).toBe(81)
    expect(demoBusinessData.financials.years.map((year) => year.revenue)).toEqual([22.1, 28.3, 36.4])
    expect(demoBusinessData.customers.total).toBe(6850)
    expect(demoBusinessData.customers.active).toBe(5420)
    expect(demoBusinessData.customers.monthlyActiveUsers).toBe(98000)
    expect(demoBusinessData.customers.retention).toBe(81)
    expect(demoBusinessData.customers.nps).toBe(61)
    expect(demoBusinessData.market.tam).toBe(18500)
    expect(demoBusinessData.competitors).toHaveLength(4)
    expect(demoBusinessData.insights).toHaveLength(5)
    expect(demoBusinessData.recommendations).toHaveLength(5)
    expect(demoBusinessData.risks).toHaveLength(6)
    expect(demoBusinessData.roadmap).toHaveLength(4)
    expect(demoBusinessData.qa).toHaveLength(6)
  })

  it("uses a fixed demo project identity", () => {
    expect(DEMO_PROJECT_ID).toBe("demo-project-intelly")
  })

  it("labels the data as illustrative", () => {
    expect(demoBusinessData.status).toBe("Illustrative Demo Data")
    expect(demoBusinessData.disclaimer).toContain("Aarohan Commerce Technologies Pvt. Ltd.")
  })
})
