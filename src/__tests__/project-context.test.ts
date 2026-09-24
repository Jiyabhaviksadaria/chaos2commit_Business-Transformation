import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const projectRecord = {
    id: "project-context-1",
    name: "Acme Health",
    industry: "Healthcare",
    businessGoal: "Analyze the source website",
    businessContext: "Existing context",
    blueprintData: { productOverview: "Persisted blueprint" },
    documents: [],
    intakeSources: [
      {
        id: "source-url",
        kind: "URL",
        label: "https://acme.example",
        url: "https://acme.example",
        status: "READY",
        extractedText: "Acme provides primary care and appointments.",
        metadata: { title: "Acme" },
      },
      {
        id: "source-doc",
        kind: "DOCUMENT",
        label: "strategy.pdf",
        status: "READY",
        checksum: "doc-checksum",
        extractedText: "The leadership team wants a patient portal.",
        metadata: { mimeType: "application/pdf" },
      },
    ],
    deliverables: [
      { type: "INTAKE_ANALYSIS", title: "Analysis", versions: [{ content: { businessSummary: "Actual analysis" } }] },
      { type: "WEBSITE_SPEC", title: "Website", versions: [{ content: { siteName: "Must not enter business context" } }] },
    ],
    projectContext: {
      metadata: {
        discoveryQuestions: [{ id: "q1", question: "Which users?" }],
        userContext: { name: "Jiya Sadaria", companyRole: "Founder / Co-Founder" },
      },
      answers: [{ questionId: "q1", question: "Which users?", answer: "Patients and staff" }],
    },
  }
  return {
    projectRecord,
    upsert: vi.fn().mockResolvedValue(undefined),
    findUnique: vi.fn().mockResolvedValue(projectRecord),
    update: vi.fn().mockResolvedValue(projectRecord),
  }
})

vi.mock("@/lib/db", () => ({
  db: {
    project: { findUnique: mocks.findUnique, update: mocks.update },
    projectContext: { upsert: mocks.upsert },
  },
}))

import { buildProjectContext, rebuildProjectContext } from "@/lib/ai/context"

describe("canonical Project Context", () => {
  beforeEach(() => vi.clearAllMocks())

  it("combines URL, document, answers, blueprint, and persisted analysis while excluding website specs", async () => {
    const snapshot = await rebuildProjectContext("project-context-1")
    expect(snapshot.sources).toHaveLength(2)
    expect(snapshot.sourceTypes).toEqual(["URL", "DOCUMENT"])
    expect(snapshot.businessContent).toContain("Acme provides primary care")
    expect(snapshot.businessContent).toContain("leadership team wants a patient portal")
    expect(snapshot.businessContent).toContain("Patients and staff")
    expect(snapshot.businessContent).toContain("Persisted blueprint")
    expect(snapshot.businessContent).toContain("Actual analysis")
    expect(snapshot.businessContent).not.toContain("Must not enter business context")
    expect(snapshot.answers[0].answer).toBe("Patients and staff")
    expect(mocks.upsert).toHaveBeenCalledOnce()
  })

  it("includes the platform user's role as separate user context", async () => {
    const context = await buildProjectContext("project-context-1")
    expect(context).toContain("USER CONTEXT (PERSON USING THE PLATFORM)")
    expect(context).toContain("Name: Jiya Sadaria")
    expect(context).toContain("Role in Company: Founder / Co-Founder")
  })
})
