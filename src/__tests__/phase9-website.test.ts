import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import {
  applyWebsiteDelta, calculateWebsiteRiskLevel,
  toggleSectionVisibilityInSpec,
  reorderSectionsInSpec, updateThemeInSpec, type WebsiteDelta
} from "@/lib/ai/website-customization-engine"
import { POST as customizeWebsite } from "@/app/api/projects/[projectId]/website/customize/route"
import { POST as applyWebsite } from "@/app/api/projects/[projectId]/website/apply/route"
import { POST as restoreWebsiteVersion } from "@/app/api/projects/[projectId]/website/versions/[versionId]/restore/route"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

const { mockProjectRecord, mockWebsiteDeliverable } = vi.hoisted(() => {
  const baseSpec: WebsiteSpecData = {
    siteName: "Dental Care Platform",
    language: "en",
    dir: "ltr",
    theme: {
      primary: "#3B82F6",
      style: "MODERN"
    },
    nav: ["Home", "About", "Services", "Contact"],
    sections: [
      { id: "hero", type: "hero", order: 1, visible: true, headline: "Expert Dental Care", subheadline: "Modern dentistry services", ctaLabel: "Book Appointment" },
      { id: "about", type: "about", order: 2, visible: true, title: "About Our Clinic", body: "Serving families for over 15 years." },
      { id: "services", type: "services", order: 3, visible: true, title: "Our Services", items: [{ title: "Checkup", description: "Routine dental cleaning" }] },
      { id: "contact", type: "contact", order: 4, visible: true, title: "Contact Us", body: "Call us today." },
      { id: "footer", type: "footer", order: 5, visible: true, text: "© 2026 Dental Care Platform" }
    ],
    seo: { title: "Dental Care Clinic", description: "Top-rated dental services." }
  }

  const mockProjectRecord = {
    id: "proj_phase9",
    name: "Dental Care Platform",
    title: "Dental Care Platform",
    businessGoal: "Automate appointment booking and patient records",
    language: "en",
    siteSlug: "dental-care-platform-1234",
    sitePublished: true,
    blueprintData: {
      productOverview: "Dental Care Platform",
      businessObjective: "Automate appointment booking and patient records",
      modules: [{ key: "patients", name: "Patients" }]
    },
    organizationId: "org_9",
    workspace: { organizationId: "org_9" }
  }

  const mockWebsiteDeliverable = {
    id: "deliv_web_9",
    projectId: "proj_phase9",
    type: "WEBSITE_SPEC",
    title: "Website Specification",
    status: "APPROVED",
    currentVersionId: "ver_1",
    versions: [
      {
        id: "ver_1",
        deliverableId: "deliv_web_9",
        versionNumber: 1,
        content: baseSpec,
        note: "Initial website spec",
        createdAt: new Date(),
        createdById: "user_test_9"
      }
    ]
  }

  return { baseSpec, mockProjectRecord, mockWebsiteDeliverable }
})

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockImplementation((projectId) => {
    if (projectId === "unauthorized") {
      throw new Error("Access Denied: Missing permissions")
    }
    return Promise.resolve({
      user: { id: "user_test_9", role: "ADMIN" },
      project: { id: projectId, workspace: { organizationId: "org_9" } }
    })
  })
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const versionStore: any[] = []
let currentProject = { ...mockProjectRecord }
let currentDeliverable = { ...mockWebsiteDeliverable }

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.id === currentProject.id || where.siteSlug === currentProject.siteSlug) {
          return Promise.resolve({
            ...currentProject,
            deliverables: [currentDeliverable]
          })
        }
        return Promise.resolve(null)
      })
    },
    deliverable: {
      findFirst: vi.fn().mockImplementation(() => Promise.resolve(currentDeliverable)),
      create: vi.fn().mockImplementation(({ data }) => {
        currentDeliverable = { ...currentDeliverable, ...data, versions: [] }
        return Promise.resolve(currentDeliverable)
      }),
      update: vi.fn().mockImplementation(({ data }) => {
        currentDeliverable = { ...currentDeliverable, ...data }
        return Promise.resolve(currentDeliverable)
      })
    },
    deliverableVersion: {
      create: vi.fn().mockImplementation(({ data }) => {
        const record = { id: `ver_${Date.now()}`, createdAt: new Date(), ...data }
        versionStore.push(record)
        currentDeliverable.versions.unshift(record)
        currentDeliverable.currentVersionId = record.id
        return Promise.resolve(record)
      }),
      findMany: vi.fn().mockImplementation(() => Promise.resolve(versionStore))
    },
    activityLog: {
      create: vi.fn().mockResolvedValue({ id: "log_web_9" })
    },
    aiUsage: {
      create: vi.fn().mockResolvedValue({ id: "usage_web_9" })
    }
  }
}))

describe("Phase 9 — Advanced AI Website Builder, Visual Customization & Responsive Public Sites", () => {
  beforeEach(() => {
    versionStore.length = 0
    currentProject = { ...mockProjectRecord }
    currentDeliverable = { ...mockWebsiteDeliverable }
    versionStore.push(mockWebsiteDeliverable.versions[0])
  })

  describe("Website Customization Engine Unit Tests", () => {
    it("should calculate risk level correctly", () => {
      expect(calculateWebsiteRiskLevel([{ type: "UPDATE_THEME" }])).toBe("MEDIUM")
      expect(calculateWebsiteRiskLevel([{ type: "REMOVE_SECTION", sectionId: "services" }])).toBe("HIGH")
      expect(calculateWebsiteRiskLevel([{ type: "UPDATE_CONTENT", sectionType: "hero" }])).toBe("LOW")
    })

    it("should deterministically apply UPDATE_THEME delta", () => {
      const baseSpec = { ...mockWebsiteDeliverable.versions[0].content as WebsiteSpecData }
      const delta: WebsiteDelta = {
        summary: "Switch to dark navy theme",
        changes: [
          {
            type: "UPDATE_THEME",
            theme: {
              style: "MODERN",
              primaryColor: "#0B1F3A",
              backgroundColor: "#07111F",
              textColor: "#FFFFFF"
            }
          }
        ],
        affectedSections: ["theme"],
        riskLevel: "LOW"
      }

      const updated = applyWebsiteDelta(baseSpec, delta)
      expect(updated.theme.primary).toBe("#0B1F3A")
      expect(updated.theme.backgroundColor).toBe("#07111F")
      expect(updated.theme.textColor).toBe("#FFFFFF")
    })

    it("should deterministically apply ADD_SECTION delta (FAQ)", () => {
      const baseSpec = { ...mockWebsiteDeliverable.versions[0].content as WebsiteSpecData }
      const delta: WebsiteDelta = {
        summary: "Add FAQ section",
        changes: [
          {
            type: "ADD_SECTION",
            section: {
              id: "faq",
              type: "faq",
              visible: true,
              title: "Frequently Asked Questions",
              items: [{ q: "What are your hours?", a: "8am - 5pm" }]
            }
          }
        ],
        affectedSections: ["faq"],
        riskLevel: "LOW"
      }

      const updated = applyWebsiteDelta(baseSpec, delta)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faq = updated.sections.find((s: any) => s.type === "faq") as any
      expect(faq).toBeDefined()
      expect(faq?.title).toBe("Frequently Asked Questions")
    })

    it("should set dir=rtl when language is set to Arabic", () => {
      const baseSpec = { ...mockWebsiteDeliverable.versions[0].content as WebsiteSpecData }
      const delta: WebsiteDelta = {
        summary: "Translate website to Arabic",
        changes: [{ type: "UPDATE_LANGUAGE", language: "ar" }],
        affectedSections: ["language"],
        riskLevel: "MEDIUM"
      }

      const updated = applyWebsiteDelta(baseSpec, delta)
      expect(updated.language).toBe("ar")
      expect(updated.dir).toBe("rtl")
    })
  })

  describe("Deterministic Section Helper Functions", () => {
    it("should toggle section visibility", () => {
      const baseSpec = { ...mockWebsiteDeliverable.versions[0].content as WebsiteSpecData }
      const hidden = toggleSectionVisibilityInSpec(baseSpec, "about", false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(hidden.sections.find((s: any) => s.id === "about")?.visible).toBe(false)
    })

    it("should reorder sections", () => {
      const baseSpec = { ...mockWebsiteDeliverable.versions[0].content as WebsiteSpecData }
      const reordered = reorderSectionsInSpec(baseSpec, 1, 0) // move about to index 0
      expect(reordered.sections[0].type).toBe("about")
    })

    it("should update theme presets", () => {
      const baseSpec = { ...mockWebsiteDeliverable.versions[0].content as WebsiteSpecData }
      const styled = updateThemeInSpec(baseSpec, { style: "BOLD", primary: "#EF4444" })
      expect(styled.theme.style).toBe("BOLD")
      expect(styled.theme.primary).toBe("#EF4444")
    })
  })

  describe("Website Customization API Endpoints", () => {
    it("should generate structured AI customization proposal (`POST /api/projects/[projectId]/website/customize`)", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase9/website/customize", {
        method: "POST",
        body: JSON.stringify({ prompt: "Change theme to dark navy and add FAQ" })
      })

      const res = await customizeWebsite(req, { params: { projectId: "proj_phase9" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.delta).toBeDefined()
      expect(body.delta.changes.length).toBeGreaterThan(0)
    }, 15000)

    it("should reject empty prompt with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase9/website/customize", {
        method: "POST",
        body: JSON.stringify({ prompt: "   " })
      })

      const res = await customizeWebsite(req, { params: { projectId: "proj_phase9" } })
      expect(res.status).toBe(400)
    })

    it("should apply approved proposal and create new WEBSITE_SPEC deliverable version (`POST /api/projects/[projectId]/website/apply`)", async () => {
      const delta: WebsiteDelta = {
        summary: "Add FAQ section",
        changes: [
          {
            type: "ADD_SECTION",
            section: {
              id: "faq",
              type: "faq",
              visible: true,
              title: "Frequently Asked Questions",
              items: [{ q: "Do you take insurance?", a: "Yes, we accept major plans." }]
            }
          }
        ],
        affectedSections: ["faq"],
        riskLevel: "LOW"
      }

      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase9/website/apply", {
        method: "POST",
        body: JSON.stringify({ delta })
      })

      const res = await applyWebsite(req, { params: { projectId: "proj_phase9" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.version.versionNumber).toBe(2)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faq = body.spec.sections.find((s: any) => s.type === "faq")
      expect(faq).toBeDefined()
    })

    it("should restore previous version by creating a NEW version (`POST /api/projects/[projectId]/website/versions/[versionId]/restore`)", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase9/website/versions/ver_1/restore", {
        method: "POST"
      })

      const res = await restoreWebsiteVersion(req, { params: { projectId: "proj_phase9", versionId: "ver_1" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.version.versionNumber).toBeGreaterThan(1)
      expect(body.version.note).toContain("Restored from Version 1")
    })

    it("should reject unauthorized project access with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/unauthorized/website/customize", {
        method: "POST",
        body: JSON.stringify({ prompt: "Change theme" })
      })

      const res = await customizeWebsite(req, { params: { projectId: "unauthorized" } })
      expect(res.status).toBe(403)
    })
  })
})
