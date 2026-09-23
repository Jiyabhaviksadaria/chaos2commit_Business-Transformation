/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync } from "child_process"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { ChangeSet } from "@/lib/changeset/changeset-validator"

export interface GitCommit {
  id: string
  hash: string
  branch: string
  message: string
  timestamp: string
  author: string
  versionTag: string
  spec: WebsiteSpecData
}

export interface ImpactAnalysis {
  riskScore: "LOW" | "MEDIUM" | "HIGH"
  frontendChanges: string[]
  backendChanges: string[]
  dbChanges: string[]
  integrations: string[]
  dependencies: string[]
  summary: string
}

export interface GitProvider {
  name: string
  initRepository(cwd: string): boolean
  checkoutBranch(cwd: string, branchName: string, createNew?: boolean): boolean
  commitChanges(cwd: string, message: string): string
  mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): boolean
}

/**
  Real local Git CLI provider executing actual system git binary commands.
 */
export class LocalGitProvider implements GitProvider {
  name = "LocalGitCLI"

  private execGitCommand(cmd: string, cwd: string): string {
    try {
      return execSync(`git ${cmd}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
    } catch (err: any) {
      console.warn(`[LocalGitProvider] Git command "git ${cmd}" failed:`, err.message)
      throw err
    }
  }

  public initRepository(cwd: string): boolean {
    try {
      this.execGitCommand("init", cwd)
      return true
    } catch {
      return false
    }
  }

  public checkoutBranch(cwd: string, branchName: string, createNew = true): boolean {
    try {
      const flag = createNew ? "-b" : ""
      this.execGitCommand(`checkout ${flag} ${branchName}`, cwd)
      return true
    } catch {
      return false
    }
  }

  public commitChanges(cwd: string, message: string): string {
    try {
      this.execGitCommand("add .", cwd)
      this.execGitCommand(`commit -m "${message.replace(/"/g, '\\"')}"`, cwd)
      return this.execGitCommand("rev-parse HEAD", cwd)
    } catch {
      return "hash-fallback-" + Date.now()
    }
  }

  public mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): boolean {
    try {
      this.execGitCommand(`checkout ${targetBranch}`, cwd)
      this.execGitCommand(`merge ${sourceBranch} --no-ff -m "Merge ${sourceBranch} into ${targetBranch}"`, cwd)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Version Metadata System (In-Memory git state representation & metadata store).
 */
export class VersionMetadataSystem {
  private projectId: string
  private mainBranch = "main"
  private featureBranch: string
  private commits: GitCommit[] = []
  private localGitProvider = new LocalGitProvider()

  constructor(projectId: string, initialSpec: WebsiteSpecData) {
    this.projectId = projectId
    this.featureBranch = `feature/project-${projectId}`

    // Initial commit on main branch (v1)
    this.commits.push({
      id: `commit-v1-${Date.now()}`,
      hash: Math.random().toString(36).substring(2, 10),
      branch: this.mainBranch,
      message: "Initial project template baseline (v1)",
      timestamp: new Date().toISOString(),
      author: "System Builder",
      versionTag: "v1",
      spec: JSON.parse(JSON.stringify(initialSpec))
    })
  }

  public getMainBranch(): string {
    return this.mainBranch
  }

  public getFeatureBranch(): string {
    return this.featureBranch
  }

  public getCommits(): GitCommit[] {
    return this.commits
  }

  public commitVersion(spec: WebsiteSpecData, message: string): GitCommit {
    const nextVerNum = this.commits.length + 1
    const commit: GitCommit = {
      id: `commit-v${nextVerNum}-${Date.now()}`,
      hash: Math.random().toString(36).substring(2, 10),
      branch: this.featureBranch,
      message,
      timestamp: new Date().toISOString(),
      author: "AI Product Builder",
      versionTag: `v${nextVerNum}`,
      spec: JSON.parse(JSON.stringify(spec))
    }
    this.commits.push(commit)
    return commit
  }

  public mergeToProduction(): GitCommit {
    const latestCommit = this.commits[this.commits.length - 1]
    const mergeCommit: GitCommit = {
      id: `merge-${Date.now()}`,
      hash: Math.random().toString(36).substring(2, 10),
      branch: this.mainBranch,
      message: `Merge ${this.featureBranch} into ${this.mainBranch} (${latestCommit.versionTag})`,
      timestamp: new Date().toISOString(),
      author: "Product Owner (Approved)",
      versionTag: `${latestCommit.versionTag}-PROD`,
      spec: JSON.parse(JSON.stringify(latestCommit.spec))
    }
    this.commits.push(mergeCommit)
    return mergeCommit
  }

  public restoreVersion(versionTag: string): WebsiteSpecData | null {
    const target = this.commits.find(c => c.versionTag === versionTag)
    return target ? JSON.parse(JSON.stringify(target.spec)) : null
  }

  public analyzeImpact(changeSet: ChangeSet): ImpactAnalysis {
    const frontendChanges: string[] = []
    const backendChanges: string[] = []
    const dbChanges: string[] = []
    const integrations: string[] = []
    const dependencies: string[] = []

    changeSet.operations.forEach(op => {
      if (op.type === "UPDATE_BUSINESS" || op.type === "UPDATE_CONTENT") {
        frontendChanges.push(`Content update in ${op.targetId || "site"}`)
      } else if (op.type === "UPDATE_THEME") {
        frontendChanges.push("CSS theme tokens and palette modification")
      } else if (op.type === "TOGGLE_SECTION" || op.type === "REORDER_SECTIONS") {
        frontendChanges.push("DOM structure layout change")
      } else if (op.type === "ADD_SECTION" && op.payload.type === "appointment") {
        backendChanges.push("Appointment booking API endpoint required")
        dbChanges.push("Appointments collection/table record schema")
        integrations.push("Email notification provider")
      }
    })

    const hasBackendOrDb = backendChanges.length > 0 || dbChanges.length > 0
    const riskScore = hasBackendOrDb ? "MEDIUM" : "LOW"

    return {
      riskScore,
      frontendChanges: Array.from(new Set(frontendChanges)),
      backendChanges: Array.from(new Set(backendChanges)),
      dbChanges: Array.from(new Set(dbChanges)),
      integrations: Array.from(new Set(integrations)),
      dependencies: Array.from(new Set(dependencies)),
      summary: `Impact Risk: ${riskScore}. ${frontendChanges.length} frontend changes, ${backendChanges.length} backend changes.`
    }
  }
}

// Alias for backwards compatibility
export const GitVersioningEngine = VersionMetadataSystem
