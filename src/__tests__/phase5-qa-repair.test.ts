import { describe, it, expect } from "vitest"
import { QAEngine } from "@/lib/build-qa/qa-engine"
import { RepairAgent } from "@/lib/build-qa/repair-agent"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Phase 5: Build / QA Engine & Repair Agent", () => {
  it("should pass QAEngine verification for valid template website specs", async () => {
    const spec = buildWebsiteSpecFromTemplate("clinic")
    const report = await QAEngine.runQA(spec)

    expect(report.passed).toBe(true)
    expect(report.totalChecks).toBe(6)
    expect(report.failedChecks).toBe(0)
  })

  it("should detect QA failure and self-heal automatically using RepairAgent (max 5 retries)", async () => {
    const BrokenSpec = buildWebsiteSpecFromTemplate("restaurant")
    BrokenSpec.siteName = "" // Will fail LINT
    BrokenSpec.theme.primary = "" // Will fail TYPECHECK
    BrokenSpec.sections.find(s => s.id === "hero")!.visible = false // Will fail UNIT_TESTS

    const report1 = await QAEngine.runQA(BrokenSpec)
    expect(report1.passed).toBe(false)
    expect(report1.failedChecks).toBeGreaterThanOrEqual(3)

    const repairRes = await RepairAgent.repair(BrokenSpec, "restaurant")
    expect(repairRes.repaired).toBe(true)
    expect(repairRes.attempt).toBeLessThanOrEqual(5)
    expect(repairRes.actionsTaken.length).toBeGreaterThan(0)
  })
})
