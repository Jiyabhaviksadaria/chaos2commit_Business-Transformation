import { PlatformRole, OrgRole } from "@prisma/client"

type Role = PlatformRole | OrgRole
export type Action =
  | "admin:access"
  | "project:create"
  | "project:edit"
  | "project:delete"
  | "deliverable:generate"
  | "deliverable:approve"
  | "member:manage"

const rolePermissions: Record<Role, Action[]> = {
  PLATFORM_ADMIN: [
    "admin:access",
    "project:create",
    "project:edit",
    "project:delete",
    "deliverable:generate",
    "deliverable:approve",
    "member:manage",
  ],
  USER: [], // A base user has no org permissions by default unless matched against an OrgRole
  OWNER: [
    "project:create",
    "project:edit",
    "project:delete",
    "deliverable:generate",
    "deliverable:approve",
    "member:manage",
  ],
  ADMIN: [
    "project:create",
    "project:edit",
    "project:delete",
    "deliverable:generate",
    "deliverable:approve",
    "member:manage",
  ],
  EDITOR: [
    "project:create",
    "project:edit",
    "deliverable:generate",
  ],
  VIEWER: [], // Viewers can read, but these are explicit write/admin actions
}

export function can(role: Role | undefined | null, action: Action): boolean {
  if (!role) return false
  if (role === PlatformRole.PLATFORM_ADMIN) return true // Superuser
  return rolePermissions[role]?.includes(action) ?? false
}
