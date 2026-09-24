import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const snapshot = {
    projectId: "p1",
    sources: [{ id: "source-1", kind: "URL", label: "https://example.com", status: "READY", extractedText: "Evidence about logistics." }],
    extractedText: "Evidence about logistics.",
    businessContent: "Project: Test Transformation Project\nEvidence about logistics.",
    metadata: { companyContext: { businessObjective: "Automate supply chain logistics" }, discovery: { status: "IN_PROGRESS", progress: 25, readyForAnalysis: false, questions: [], understanding: { confirmedFacts: [], currentProcess: [], observedProblems: [], potentialRootCauses: [], unknowns: [], constraints: [], evidence: [], businessImpact: [] } } },
    sourceTypes: ["URL"],
    answers: [],
    updatedAt: new Date().toISOString(),
  }
  return {
    snapshot,
    getSnapshot: vi.fn().mockResolvedValue(snapshot),
    buildContext: vi.fn().mockResolvedValue(snapshot.businessContent),
    updateMetadata: vi.fn().mockResolvedValue(snapshot),
    upsertAnswers: vi.fn().mockImplementation(async (_projectId: string, answers: Array<Record<string, unknown>>) => ({ ...mocks.snapshot, answers })),
    projectUpdate: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "p1", ...data })),
  }
})

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    project: {
      id: "p1",
      name: "Test Transformation Project",
      businessGoal: "Automate supply chain logistics",
      businessContext: "Legacy manual processing",
      language: "en",
      discoveryCompleteness: 50,
      digitalMaturity: 60,
      aiReadiness: 65,
      workspace: { organizationId: "org-1" },
    },
  }),
}))

vi.mock("@/lib/db", () => ({
  db: {
    document: { count: vi.fn().mockResolvedValue(1) },
    project: { update: mocks.projectUpdate },
    projectContext: { update: vi.fn() },
  },
}))

vi.mock("@/lib/ai/context", () => ({
  getProjectContextSnapshot: mocks.getSnapshot,
  buildProjectContext: mocks.buildContext,
  updateProjectContextMetadata: mocks.updateMetadata,
  upsertProjectContextAnswers: mocks.upsertAnswers,
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        questions: [{
          id: "q1",
          category: "Operations",
          question: "What is your target daily throughput?",
          reason: "This determines the scale of the operating model.",
          whyItMatters: "This determines the scale of the operating model.",
          rationale: "This determines the scale of the operating model.",
          suggestedAnswers: [],
          priority: "HIGH",
          informationValue: 90,
          evidenceRefs: [],
          status: "OPEN",
        }],
        understanding: {
          confirmedFacts: [],
          currentProcess: [],
          observedProblems: [],
          potentialRootCauses: [],
          unknowns: [],
          constraints: [],
          evidence: [],
          businessImpact: [],
        },
        readyForAnalysis: false,
        confidence: 40,
        nextFocus: "Clarify the current process.",
      },
    },
  }),
}))

import { generateStructured } from "@/lib/ai/orchestrator"
import { POST as questionsHandler } from "@/app/api/projects/[projectId]/discovery/questions/route"
import { POST as answerHandler } from "@/app/api/projects/[projectId]/discovery/answer/route"
import { POST as recalculateHandler } from "@/app/api/projects/[projectId]/discovery/recalculate/route"

describe("Discovery & Business Analysis API Routes", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns adaptive questions with rationale and state", async () => {
    const req = new Request("http://localhost/api/projects/p1/discovery/questions", { method: "POST" })
    const res = await questionsHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.questions.length).toBeGreaterThan(0)
    expect(json.questions[0].rationale).toContain("scale")
    expect(json.discoveryState.status).toBe("IN_PROGRESS")
  })

  it("persists answers and returns the updated discovery state", async () => {
    const req = new Request("http://localhost/api/projects/p1/discovery/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: [{ category: "Operations", question: "What is your target daily throughput?", answer: "50,000 orders/day" }] }),
    })
    const res = await answerHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mocks.upsertAnswers).toHaveBeenCalledOnce()
    expect(json.discoveryState).toBeDefined()
  })

  it("returns baseline questions when the AI provider is unavailable", async () => {
    vi.mocked(generateStructured).mockResolvedValueOnce({ ok: false, error: { code: "AI_UNAVAILABLE", message: "offline" } })
    const req = new Request("http://localhost/api/projects/p1/discovery/questions", { method: "POST" })
    const res = await questionsHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.degradedMode).toBe(true)
    expect(json.questions.length).toBeGreaterThan(0)
    expect(json.notice).toContain("no conclusions")
  })

  it("returns insufficient information instead of fabricated readiness percentages", async () => {
    const req = new Request("http://localhost/api/projects/p1/discovery/recalculate", { method: "POST" })
    const res = await recalculateHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.readiness.status).toBe("INSUFFICIENT_INFORMATION")
    expect(json.readiness.overallScore).toBeNull()
  })
})
