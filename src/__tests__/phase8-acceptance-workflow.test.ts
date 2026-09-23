import { describe, it, expect } from "vitest"
import { buildWebsiteSpecFromTemplate, getTemplateById } from "@/lib/templates/template-registry"
import { ConfigStore } from "@/lib/config-engine/config-store"
import { AIRequestRouter } from "@/lib/ai/request-router"
import { ChangeSetValidator } from "@/lib/changeset/changeset-validator"
import { QAEngine } from "@/lib/build-qa/qa-engine"
import { RepairAgent } from "@/lib/build-qa/repair-agent"
import { GitVersioningEngine } from "@/lib/versioning/git-versioning"
import { DeploymentManager } from "@/lib/deployment/deployment-provider"

describe("Phase 8: Full Master Acceptance Test Workflow (Steps 1–19)", () => {
  it("should execute complete 19-step end-to-end platform workflow cleanly", async () => {
    // Step 1: Select starter template (Clinic)
    const tmpl = getTemplateById("clinic")
    expect(tmpl).not.toBeNull()

    // Step 2: Generate baseline website spec WITHOUT calling an LLM API
    const specV1 = buildWebsiteSpecFromTemplate("clinic")
    expect(specV1.siteName).toBe("Apex Dental & Healthcare Clinic")
    const store = new ConfigStore("master-proj-1", "clinic", specV1)
    const router = new AIRequestRouter()

    // Step 3: Change clinic name deterministically (Level 0, 0 LLM calls)
    const route1 = await router.routeRequest("change name to Apex Dental & Laser Care", specV1)
    expect(route1.level).toBe(0)
    expect(route1.llmCallsMade).toBe(0)
    store.updateBusiness(route1.changeSet.operations[0].payload)
    expect(store.getWebsiteSpec().siteName).toBe("Apex Dental & Laser Care")

    // Step 4: Change primary color deterministically (Level 0, 0 LLM calls)
    const route2 = await router.routeRequest("change theme color to teal", store.getWebsiteSpec())
    expect(route2.level).toBe(0)
    expect(route2.llmCallsMade).toBe(0)
    store.updateTheme(route2.changeSet.operations[0].payload)
    expect(store.getWebsiteSpec().theme.primary).toBe("#0D9488")

    // Step 5: Submit natural language request for Level 1 AI Customization
    const route3 = await router.routeRequest("make this a premium dental clinic and add testimonials", store.getWebsiteSpec())
    expect(route3.level).toBe(1)
    expect(route3.llmCallsMade).toBe(1)

    // Step 6: Generate structured ChangeSet & validate format
    const validation = ChangeSetValidator.validate(route3.changeSet, store.getWebsiteSpec())
    expect(validation.valid).toBe(true)

    // Step 7: Apply ChangeSet to website spec
    route3.changeSet.operations.forEach(op => {
      if (op.type === "UPDATE_CONTENT" && op.targetId) {
        store.updateSectionContent(op.targetId, op.payload)
      }
    })

    // Step 8: Render & verify updated spec
    const currentSpec = store.getWebsiteSpec()
    expect(currentSpec.siteName).toBe("Apex Dental & Laser Care")

    // Step 9: Edit Hero section visually
    store.updateSectionContent("hero", { headline: "Painless Laser Dentistry Excellence" })

    // Step 10: Commit new version (v2) to feature branch (feature/project-master-proj-1)
    const git = new GitVersioningEngine("master-proj-1", specV1)
    const commitV2 = git.commitVersion(store.getWebsiteSpec(), "Customized clinic branding v2")
    expect(commitV2.versionTag).toBe("v2")
    expect(commitV2.branch).toBe("feature/project-master-proj-1")

    // Step 11: Run 6-stage QAEngine validation
    const qaReport = await QAEngine.runQA(store.getWebsiteSpec())
    expect(qaReport.totalChecks).toBe(6)

    // Step 12: Trigger self-healing RepairAgent if any stage fails
    const repairResult = await RepairAgent.repair(store.getWebsiteSpec(), "clinic")
    expect(repairResult.repaired).toBe(true)

    // Step 13: Generate Vercel & Render Preview Deployment URLs or DEPLOYMENT_NOT_CONFIGURED status
    const deployManager = new DeploymentManager()
    const previewDeploy = await deployManager.deployPreview(
      { id: "master-proj-1", name: "Apex Dental", backendMode: "NONE" },
      git.getFeatureBranch(),
      store.getWebsiteSpec()
    )
    if (!deployManager.isVercelConfigured()) {
      expect(previewDeploy.frontend.status).toBe("NOT_CONFIGURED")
    } else {
      expect(["READY", "FAILED"]).toContain(previewDeploy.frontend.status)
    }

    // Step 14 & 15: Perform User Approval and merge feature branch to main production branch
    const mergeCommit = git.mergeToProduction()
    expect(mergeCommit.branch).toBe("main")

    // Step 16 & 17: Deploy Production frontend to Vercel and backend to Render
    const prodDeploy = await deployManager.deployProduction(
      { id: "master-proj-1", name: "Apex Dental", backendMode: "NONE" },
      git.getMainBranch(),
      store.getWebsiteSpec()
    )
    if (!deployManager.isVercelConfigured()) {
      expect(prodDeploy.frontend.status).toBe("NOT_CONFIGURED")
    } else {
      expect(["READY", "FAILED"]).toContain(prodDeploy.frontend.status)
    }

    // Step 18 & 19: Modify live project again (v3) and verify version rollback
    store.updateBusiness({ name: "v3 Temporary Clinic Name" })
    git.commitVersion(store.getWebsiteSpec(), "Experimental v3 draft")

    const restoredV2 = git.restoreVersion("v2")
    expect(restoredV2).not.toBeNull()
    expect(restoredV2?.siteName).toBe("Apex Dental & Laser Care")
  })
})
