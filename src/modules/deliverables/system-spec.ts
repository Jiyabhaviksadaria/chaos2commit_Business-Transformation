import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

const ALLOWED_ICONS = ["Users", "Building2", "Calendar", "CheckSquare", "ClipboardList",
  "Package", "ShoppingCart", "FileText", "BarChart3", "Settings", "Mail", "Phone",
  "MapPin", "DollarSign", "Clock", "Star", "Tag", "Briefcase", "Box", "Database",
  "Globe", "Home", "Search", "Bell", "Shield", "Truck", "Heart", "Award"]

const FIELD_TYPES = ["text", "textarea", "number", "currency", "date", "datetime",
  "select", "email", "phone", "url", "boolean", "checklist"] as const

export const FieldSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string(),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  showInTable: z.boolean().default(true)
})

export const ModuleSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  kind: z.enum(["CRM", "ATTENDANCE", "ONBOARDING", "GENERIC"]),
  fields: z.array(FieldSchema).max(12),
  views: z.array(z.enum(["table", "kanban"])),
  kanbanField: z.string().optional(),
  quickActions: z.array(z.enum(["CHECK_IN_OUT"])).optional(),
  problemIds: z.array(z.string()).optional(),
  requirementIds: z.array(z.string()).optional()
})

export const SystemSpecSchema = z.object({
  appName: z.string(),
  tagline: z.string(),
  theme: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    style: z.enum(["MODERN", "CLASSIC", "BOLD"])
  }),
  modules: z.array(ModuleSchema).max(8),
  workflows: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    steps: z.array(z.string()),
    problemIds: z.array(z.string()).optional(),
    requirementIds: z.array(z.string()).optional()
  })),
  roles: z.array(z.object({
    name: z.string(),
    permissions: z.array(z.string()),
    requirementIds: z.array(z.string()).optional()
  }))
})

export type SystemSpecData = z.infer<typeof SystemSpecSchema>
export type ModuleData = z.infer<typeof ModuleSchema>
export type FieldData = z.infer<typeof FieldSchema>

/** Server-side sanitizer: enforces all safety constraints */
export function sanitizeSystemSpec(raw: unknown): SystemSpecData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = raw as any
  const seenModuleKeys = new Set<string>()

  const modules = (Array.isArray(obj?.modules) ? obj.modules : []).slice(0, 8).map((m: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = m as any
    const key = slugify(mod?.key || mod?.name || "module")
    const uniqueKey = dedup(key, seenModuleKeys)
    seenModuleKeys.add(uniqueKey)

    const seenFieldKeys = new Set<string>()
    const fields = (Array.isArray(mod?.fields) ? mod.fields : []).slice(0, 12)
      .filter((f: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const field = f as any
        return FIELD_TYPES.includes(field?.type)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const field = f as any
        const fKey = slugify(field?.key || field?.label || "field")
        const uniqueFKey = dedup(fKey, seenFieldKeys)
        seenFieldKeys.add(uniqueFKey)
        return {
          key: uniqueFKey,
          label: String(field?.label || field?.key || uniqueFKey),
          type: field.type as typeof FIELD_TYPES[number],
          required: Boolean(field?.required),
          options: Array.isArray(field?.options) ? field.options.map(String) : undefined,
          showInTable: field?.showInTable !== false
        }
      })

    const views: Array<"table" | "kanban"> = ["table"]
    if (mod?.views?.includes("kanban")) {
      const kanbanField = fields.find((f: FieldData) => f.key === mod.kanbanField && f.type === "select")
      if (kanbanField) views.push("kanban")
    }

    const icon = ALLOWED_ICONS.includes(mod?.icon) ? mod.icon : "Box"

    return {
      key: uniqueKey,
      name: String(mod?.name || uniqueKey),
      description: String(mod?.description || ""),
      icon,
      kind: ["CRM", "ATTENDANCE", "ONBOARDING", "GENERIC"].includes(mod?.kind) ? mod.kind : "GENERIC",
      fields,
      views,
      kanbanField: views.includes("kanban") ? mod.kanbanField : undefined,
      quickActions: mod?.quickActions?.filter((a: string) => a === "CHECK_IN_OUT") ?? undefined
    } as z.infer<typeof ModuleSchema>
  })

  const primary = /^#[0-9a-fA-F]{6}$/.test(obj?.theme?.primary) ? obj.theme.primary : "#6366f1"
  const style = ["MODERN", "CLASSIC", "BOLD"].includes(obj?.theme?.style) ? obj.theme.style : "MODERN"

  return {
    appName: String(obj?.appName || "My App"),
    tagline: String(obj?.tagline || ""),
    theme: { primary, style },
    modules,
    workflows: Array.isArray(obj?.workflows) ? obj.workflows.slice(0, 10).map((w: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wf = w as any
      return {
        name: String(wf?.name || "Workflow"),
        trigger: String(wf?.trigger || ""),
        steps: Array.isArray(wf?.steps) ? wf.steps.map(String) : []
      }
    }) : [],
    roles: Array.isArray(obj?.roles) ? obj.roles.slice(0, 6).map((r: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = r as any
      return {
        name: String(role?.name || "User"),
        permissions: Array.isArray(role?.permissions) ? role.permissions.map(String) : []
      }
    }) : []
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "item"
}

function dedup(key: string, seen: Set<string>): string {
  if (!seen.has(key)) return key
  let i = 2
  while (seen.has(`${key}_${i}`)) i++
  return `${key}_${i}`
}

export function initSystemSpecModule() {
  registerDeliverable<SystemSpecData>({
    type: DeliverableType.SYSTEM_SPEC,
    i18nTitleKey: "deliverables.system_spec.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: `You are an expert system architect. Design a workable application system spec as JSON from the discovered business problems, requirements, user roles, process needs, data needs, and evidence. Tailor every module and workflow to evidenced needs and link them to problem/requirement IDs when available. Do not invent integrations or precision that is not supported.
Rules:
- max 8 modules, max 12 fields per module
- field keys must be lowercase snake_case
- icon must be a valid Lucide icon name
- for kanban view: kanbanField must be a select field key
- field types: text|textarea|number|currency|date|datetime|select|email|phone|url|boolean|checklist
- ATTENDANCE modules should have quickActions: ["CHECK_IN_OUT"]
- CRM/ONBOARDING modules benefit from kanban views with a stage select field
Generate realistic, practical modules tailored to the business.`,
    buildUserPrompt: (ctx: string, extra?: string) => {
      return `Design a complete system spec for this business:\n\n${ctx}\n\n${extra ? `Instructions: ${extra}` : ""}\n\nReturn the full JSON system spec.`
    },
    outputSchema: SystemSpecSchema,
    mockFixture: { appName: "My App", tagline: "", theme: { primary: "#6366f1", style: "MODERN" }, modules: [], workflows: [], roles: [] }
  })
}
