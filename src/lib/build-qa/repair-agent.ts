/* eslint-disable @typescript-eslint/no-explicit-any */
import { QAEngine, QAReport } from "@/lib/build-qa/qa-engine"
import { ConfigStore } from "@/lib/config-engine/config-store"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export interface RepairAttemptResult {
  attempt: number
  repaired: boolean
  report: QAReport
  actionsTaken: string[]
}

export class RepairAgent {
  private static MAX_ATTEMPTS = 5

  /**
   * Run self-healing repair loop (max 5 retries).
   */
  public static async repair(spec: WebsiteSpecData, templateId = "clinic", cwd?: string): Promise<RepairAttemptResult> {
    let currentSpec = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
    const configStore = new ConfigStore("repair-session", templateId, currentSpec)
    const actionsTaken: string[] = []

    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      const report = await QAEngine.runQA(currentSpec, cwd)
      if (report.passed) {
        return {
          attempt,
          repaired: true,
          report,
          actionsTaken
        }
      }

      // Diagnose failures & apply repairs
      report.results.forEach(res => {
        if (!res.passed) {
          if (res.stage === "LINT" && res.details?.includes("siteName cannot be empty")) {
            currentSpec = configStore.updateBusiness({ name: "Repaired Business Name" })
            actionsTaken.push(`Attempt ${attempt}: Set missing siteName`)
          }
          if (res.stage === "TYPECHECK" && res.details?.includes("Primary theme color is missing")) {
            currentSpec = configStore.updateTheme({ primary: "#0D9488" })
            actionsTaken.push(`Attempt ${attempt}: Restored missing primary theme color`)
          }
          if (res.stage === "UNIT_TESTS" && res.details?.includes("Hero section is required and must be visible")) {
            currentSpec = configStore.toggleSection("hero", true)
            actionsTaken.push(`Attempt ${attempt}: Enabled hidden Hero section`)
          }
        }
      })
    }

    const finalReport = await QAEngine.runQA(currentSpec, cwd)
    return {
      attempt: this.MAX_ATTEMPTS,
      repaired: finalReport.passed,
      report: finalReport,
      actionsTaken
    }
  }
}
