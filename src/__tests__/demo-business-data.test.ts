import { describe, expect, it } from "vitest"
import { demoBusinessData, DEMO_PROJECT_ID } from "@/lib/demo-business-data"

describe("NovaCart demo business data", () => {
  it("keeps the demo dataset deterministic and complete", () => {
    expect(demoBusinessData.company.name).toBe("NovaCart Technologies Pvt. Ltd.")
    expect(demoBusinessData.health.overall).toBe(78)
    expect(demoBusinessData.financials.years.map((year) => year.revenue)).toEqual([24.6, 32.5, 42.8])
    expect(demoBusinessData.customers.total).toBe(8420)
    expect(demoBusinessData.market.tam).toBe(18500)
    expect(demoBusinessData.competitors).toHaveLength(5)
    expect(demoBusinessData.insights).toHaveLength(5)
    expect(demoBusinessData.recommendations).toHaveLength(5)
    expect(demoBusinessData.risks).toHaveLength(5)
    expect(demoBusinessData.roadmap).toHaveLength(4)
    expect(demoBusinessData.qa).toHaveLength(6)
  })

  it("uses a fixed demo project identity", () => {
    expect(DEMO_PROJECT_ID).toBe("demo-project-intelly")
  })

  it("labels the data as illustrative", () => {
    expect(demoBusinessData.status).toBe("Illustrative Demo Data")
    expect(demoBusinessData.disclaimer).toContain("not verified real-world data")
  })
})
