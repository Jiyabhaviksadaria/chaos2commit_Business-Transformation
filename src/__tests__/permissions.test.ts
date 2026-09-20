import { describe, expect, it } from "vitest"
import { can } from "../lib/permissions"
import { PlatformRole, OrgRole } from "@prisma/client"

describe("RBAC Permissions: can()", () => {
  it("allows PLATFORM_ADMIN to do anything", () => {
    expect(can(PlatformRole.PLATFORM_ADMIN, "admin:access")).toBe(true)
    expect(can(PlatformRole.PLATFORM_ADMIN, "project:delete")).toBe(true)
    expect(can(PlatformRole.PLATFORM_ADMIN, "member:manage")).toBe(true)
  })

  it("restricts base USER from org actions", () => {
    expect(can(PlatformRole.USER, "admin:access")).toBe(false)
    expect(can(PlatformRole.USER, "project:create")).toBe(false)
  })

  it("allows OWNER to manage projects and members, but not admin:access", () => {
    expect(can(OrgRole.OWNER, "project:create")).toBe(true)
    expect(can(OrgRole.OWNER, "member:manage")).toBe(true)
    expect(can(OrgRole.OWNER, "admin:access")).toBe(false)
  })

  it("restricts EDITOR mostly to content generation", () => {
    expect(can(OrgRole.EDITOR, "project:create")).toBe(true)
    expect(can(OrgRole.EDITOR, "project:edit")).toBe(true)
    expect(can(OrgRole.EDITOR, "deliverable:generate")).toBe(true)
    
    // Editor restricted
    expect(can(OrgRole.EDITOR, "project:delete")).toBe(false)
    expect(can(OrgRole.EDITOR, "member:manage")).toBe(false)
    expect(can(OrgRole.EDITOR, "deliverable:approve")).toBe(false)
  })

  it("restricts VIEWER from mutating effectively", () => {
    expect(can(OrgRole.VIEWER, "project:edit")).toBe(false)
    expect(can(OrgRole.VIEWER, "project:delete")).toBe(false)
    expect(can(OrgRole.VIEWER, "deliverable:generate")).toBe(false)
  })

  it("handles null or undefined safely", () => {
    expect(can(undefined, "project:create")).toBe(false)
    expect(can(null, "project:create")).toBe(false)
  })
})
