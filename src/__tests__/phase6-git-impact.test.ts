import { describe, it, expect } from "vitest"
import { GitVersioningEngine } from "@/lib/versioning/git-versioning"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import type { ChangeSet } from "@/lib/changeset/changeset-validator"

describe("Phase 6: Git Versioning & Change Impact Analysis", () => {
  it("should manage branches (main vs feature), commit versions, and merge to production", () => {
    const spec = buildWebsiteSpecFromTemplate("clinic")
    const git = new GitVersioningEngine("proj-100", spec)

    expect(git.getMainBranch()).toBe("main")
    expect(git.getFeatureBranch()).toBe("feature/project-proj-100")
    expect(git.getCommits().length).toBe(1)

    // Commit v2
    spec.siteName = "Updated Clinic Name"
    const commit2 = git.commitVersion(spec, "Update business name to v2")
    expect(commit2.versionTag).toBe("v2")
    expect(git.getCommits().length).toBe(2)

    // Merge v2 to production
    const mergeCommit = git.mergeToProduction()
    expect(mergeCommit.branch).toBe("main")
    expect(mergeCommit.spec.siteName).toBe("Updated Clinic Name")

    // Restore v1
    const restoredV1 = git.restoreVersion("v1")
    expect(restoredV1).not.toBeNull()
    expect(restoredV1?.siteName).not.toBe("Updated Clinic Name")
  })

  it("should perform Change Impact Analysis across components", () => {
    const spec = buildWebsiteSpecFromTemplate("startup")
    const git = new GitVersioningEngine("proj-101", spec)

    const changeSet: ChangeSet = {
      id: "cs-impact-1",
      description: "Add appointment booking section with database backend",
      aiGenerated: true,
      operations: [
        {
          type: "UPDATE_THEME",
          payload: { primary: "#6366F1" }
        },
        {
          type: "ADD_SECTION",
          payload: { id: "appointment_sec", type: "appointment" }
        }
      ]
    }

    const impact = git.analyzeImpact(changeSet)
    expect(impact.riskScore).toBe("MEDIUM")
    expect(impact.frontendChanges.length).toBeGreaterThan(0)
    expect(impact.backendChanges.length).toBeGreaterThan(0)
    expect(impact.dbChanges.length).toBeGreaterThan(0)
  })
})
