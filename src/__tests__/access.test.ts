import { describe, expect, it, vi, beforeEach } from "vitest"
import { requireProjectAccess, AccessError } from "../lib/access"
import { db } from "../lib/db"

// Mock the NextAuth session extraction
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

// Mock DB
vi.mock("../lib/db", () => ({
  db: {
    project: {
      findUnique: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    }
  },
}))

import { getServerSession } from "next-auth"
import { PlatformRole, OrgRole } from "@prisma/client"

describe("Access Guard: requireProjectAccess()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws AccessError if user tries to access a project from another organization", async () => {
    // 1. User is logged in as a standard USER (id: user-1)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", role: PlatformRole.USER }
    })

    // 2. The requested Project Belongs to org-2. User-1 is NOT a member of org-2.
    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: "project-1",
      workspace: {
        organization: {
          id: "org-2",
          memberships: [] // Empty means no membership matches `userId: user-1`
        }
      }
    } as never)

    await expect(requireProjectAccess("project-1")).rejects.toThrowError(
      new AccessError("You are not a member of the organization owning this project")
    )
  })

  it("returns project context if user is a valid member", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-2", role: PlatformRole.USER }
    })

    vi.mocked(db.project.findUnique).mockResolvedValue({
      id: "project-2",
      workspace: {
        organization: {
          id: "org-2",
          memberships: [
            { userId: "user-2", organizationId: "org-2", role: OrgRole.EDITOR }
          ]
        }
      }
    } as never)

    const result = await requireProjectAccess("project-2")
    expect(result.project.id).toBe("project-2")
    expect(result.orgRole).toBe(OrgRole.EDITOR)
  })
})
