import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST as questionsHandler } from "@/app/api/projects/[projectId]/discovery/questions/route"
import { POST as answerHandler } from "@/app/api/projects/[projectId]/discovery/answer/route"
import { POST as recalculateHandler } from "@/app/api/projects/[projectId]/discovery/recalculate/route"

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({
    project: {
      id: "p1",
      name: "Test Transformation Project",
      businessGoal: "Automate supply chain logistics",
      businessContext: "Legacy manual processing",
      language: "en",
      discoveryCompleteness: 50,
      digitalMaturity: 60,
      aiReadiness: 65
    }
  })
}))

vi.mock("@/lib/db", () => ({
  db: {
    document: {
      findMany: vi.fn().mockResolvedValue([
        { filename: "spec.pdf", summary: "Logistics requirement document" }
      ]),
      count: vi.fn().mockResolvedValue(1)
    },
    project: {
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: "p1",
        name: "Test Transformation Project",
        ...data
      }))
    }
  }
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        questions: [
          {
            id: "q1",
            category: "Operations",
            question: "What is your target daily throughput?",
            whyItMatters: "Determines database sharding requirement"
          }
        ],
        digitalMaturity: 85,
        aiReadiness: 88,
        discoveryCompleteness: 90,
        summaryReasoning: "Strong baseline"
      }
    }
  })
}))

describe("Discovery & Business Analysis API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("POST /api/projects/[projectId]/discovery/questions returns AI questions", async () => {
    const req = new Request("http://localhost/api/projects/p1/discovery/questions", {
      method: "POST"
    })

    const res = await questionsHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.questions).toBeDefined()
    expect(json.questions.length).toBeGreaterThan(0)
    expect(json.questions[0].category).toBe("Operations")
  })

  it("POST /api/projects/[projectId]/discovery/answer saves answers and updates metrics", async () => {
    const req = new Request("http://localhost/api/projects/p1/discovery/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [
          {
            category: "Operations",
            question: "What is your target daily throughput?",
            answer: "50,000 orders/day"
          }
        ]
      })
    })

    const res = await answerHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.discoveryCompleteness).toBeGreaterThanOrEqual(60)
  })

  it("POST /api/projects/[projectId]/discovery/recalculate re-evaluates scores", async () => {
    const req = new Request("http://localhost/api/projects/p1/discovery/recalculate", {
      method: "POST"
    })

    const res = await recalculateHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.digitalMaturity).toBe(85)
    expect(json.aiReadiness).toBe(88)
    expect(json.discoveryCompleteness).toBe(90)
  })
})
