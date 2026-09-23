/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { getMessages, getLanguageName, SUPPORTED_LANGUAGES } from "@/lib/i18n/languages"
import { POST as updateLanguage } from "@/app/api/projects/[projectId]/language/route"

const mockProjectStore: Record<string, any> = {
  "proj_14": {
    id: "proj_14",
    title: "Global Supply Chain Modernization",
    language: "en",
    workspace: { organizationId: "org_1" }
  }
}

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(async (projectId: string) => {
    const project = mockProjectStore[projectId]
    if (!project) throw new Error("Project not found")
    return {
      user: { id: "user_admin", role: "ADMIN" },
      project
    }
  })
}))

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      update: vi.fn(async ({ where, data }) => {
        if (mockProjectStore[where.id]) {
          mockProjectStore[where.id].language = data.language
        }
        return mockProjectStore[where.id]
      })
    },
    activityLog: {
      create: vi.fn(async () => ({ id: "act_lang_1" }))
    }
  }
}))

describe("Phase 14 — Multilingual Platform & Localization Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should list 8 supported languages in language catalog", () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(8)
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(codes).toContain("en")
    expect(codes).toContain("hi")
    expect(codes).toContain("gu")
    expect(codes).toContain("es")
    expect(codes).toContain("fr")
  })

  it("should load localized messages correctly with English fallback", () => {
    const enMsg = getMessages("en")
    expect(enMsg.Shell.workspace).toBe("Workspace")

    const hiMsg = getMessages("hi")
    expect(hiMsg.Shell.workspace).toBe("कार्यक्षेत्र")

    const guMsg = getMessages("gu")
    expect(guMsg.Shell.workspace).toBe("કાર્યક્ષેત્ર")

    const fallbackMsg = getMessages("unknown_locale")
    expect(fallbackMsg.Shell.workspace).toBe("Workspace")
  })

  it("should format display language names with flags", () => {
    expect(getLanguageName("hi")).toBe("🇮🇳 Hindi")
    expect(getLanguageName("gu")).toBe("🇮🇳 Gujarati")
    expect(getLanguageName("es")).toBe("🇪🇸 Spanish")
  })

  it("should update project language preference via API (`POST /api/projects/[projectId]/language`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_14/language", {
      method: "POST",
      body: JSON.stringify({ language: "hi" })
    })

    const res = await updateLanguage(req, { params: { projectId: "proj_14" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.project.language).toBe("hi")
  })
})
