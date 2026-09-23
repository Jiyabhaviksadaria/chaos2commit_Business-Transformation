import { z } from "zod"
import { generateStructured } from "./orchestrator"
import type { Result } from "@/lib/result"
import { ok } from "@/lib/result"

export const ChangeTypeSchema = z.enum([
  "ADD_MODULE",
  "UPDATE_MODULE",
  "REMOVE_MODULE",
  "ADD_FIELD",
  "UPDATE_FIELD",
  "REMOVE_FIELD",
  "ADD_WORKFLOW",
  "UPDATE_WORKFLOW",
  "REMOVE_WORKFLOW",
  "ADD_ROLE",
  "UPDATE_ROLE",
  "REMOVE_ROLE",
  "UPDATE_UI",
  "UPDATE_DASHBOARD",
  "UPDATE_DATABASE",
  "UPDATE_API",
  "UPDATE_INTEGRATION"
])

export type ChangeType = z.infer<typeof ChangeTypeSchema>

export const ChangeItemSchema = z.object({
  type: ChangeTypeSchema,
  module: z.string().optional(),
  field: z.object({
    name: z.string(),
    label: z.string().optional(),
    type: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional()
  }).optional(),
  workflow: z.object({
    name: z.string(),
    description: z.string().optional(),
    trigger: z.string().optional(),
    steps: z.array(z.string()).optional()
  }).optional(),
  role: z.object({
    role: z.string(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional()
  }).optional(),
  details: z.string().optional()
})

export type ChangeItem = z.infer<typeof ChangeItemSchema>

export const BlueprintDeltaSchema = z.object({
  summary: z.string(),
  changes: z.array(ChangeItemSchema),
  affectedModules: z.array(z.string()),
  affectedDeliverables: z.array(z.string()),
  affectedRuntimeComponents: z.array(z.string()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  requiresApproval: z.boolean().default(true)
})

export type BlueprintDelta = z.infer<typeof BlueprintDeltaSchema>

export function calculateRiskLevel(changes: ChangeItem[]): "LOW" | "MEDIUM" | "HIGH" {
  let hasHigh = false
  let hasMedium = false

  for (const change of changes) {
    if (
      change.type === "REMOVE_MODULE" ||
      change.type === "REMOVE_FIELD" ||
      change.type === "REMOVE_ROLE" ||
      change.type === "UPDATE_DATABASE"
    ) {
      hasHigh = true
    } else if (
      change.type === "ADD_WORKFLOW" ||
      change.type === "UPDATE_WORKFLOW" ||
      change.type === "REMOVE_WORKFLOW" ||
      change.type === "ADD_ROLE" ||
      change.type === "UPDATE_ROLE" ||
      change.type === "UPDATE_API" ||
      (change.type === "ADD_FIELD" && change.field?.required)
    ) {
      hasMedium = true
    }
  }

  if (hasHigh) return "HIGH"
  if (hasMedium) return "MEDIUM"
  return "LOW"
}

export async function generateBlueprintDelta(opts: {
  prompt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blueprint: any
  language?: string
  userId?: string
  organizationId?: string
}): Promise<Result<BlueprintDelta, string>> {
  const lang = opts.language || "en"
  const systemPrompt = `You are an expert Enterprise Software Architect AI.
The user wants to customize their Master Blueprint using natural language.
Analyze the user's prompt against the existing Blueprint structure:
Existing Blueprint: ${JSON.stringify(opts.blueprint, null, 2)}

Output a structured JSON Blueprint Delta containing:
- summary: Brief clear summary of what will be modified
- changes: Array of concrete change operations (ADD_MODULE, ADD_FIELD, ADD_WORKFLOW, ADD_ROLE, etc.)
- affectedModules: Array of module keys impacted
- affectedDeliverables: Array of deliverable keys impacted (e.g., ["SYSTEM_SPEC", "DATABASE_DESIGN", "API_DESIGN", "REQUIREMENTS"])
- affectedRuntimeComponents: Array of runtime UI/API components impacted (e.g., ["FORM", "TABLE", "API", "CSV", "KANBAN"])
- riskLevel: "LOW" (optional field, label change), "MEDIUM" (required field, workflow, role), "HIGH" (delete module/field, security)
- requiresApproval: true`

  const userPrompt = `User Customization Prompt: "${opts.prompt}"`

  const res = await generateStructured({
    task: "BLUEPRINT_CUSTOMIZATION",
    system: systemPrompt,
    user: userPrompt,
    schema: BlueprintDeltaSchema,
    language: lang,
    userId: opts.userId,
    organizationId: opts.organizationId
  })

  if (res.ok) {
    const delta = res.data.data
    // Ensure risk level is calculated consistently
    const computedRisk = calculateRiskLevel(delta.changes)
    if (computedRisk === "HIGH") delta.riskLevel = "HIGH"
    else if (computedRisk === "MEDIUM" && delta.riskLevel === "LOW") delta.riskLevel = "MEDIUM"

    return ok(delta)
  }

  // Safe fallback delta generation if AI is unavailable or offline
  const fallbackDelta = createFallbackDelta(opts.prompt, opts.blueprint)
  return ok(fallbackDelta)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createFallbackDelta(prompt: string, blueprint: any): BlueprintDelta {
  const p = prompt.toLowerCase()
  const modules = blueprint?.modules || []
  const targetModule = modules.find((m: { key: string; name: string }) =>
    p.includes(m.key.toLowerCase()) || p.includes(m.name.toLowerCase())
  )
  const targetModuleKey = targetModule ? targetModule.key : (modules[0]?.key || "general")

  if (p.includes("workflow") || p.includes("approval") || p.includes("process")) {
    const workflowName = prompt.slice(0, 40)
    return {
      summary: `Add automated workflow: ${workflowName}`,
      changes: [
        {
          type: "ADD_WORKFLOW",
          workflow: {
            name: workflowName,
            description: prompt,
            trigger: "STATUS_CHANGE",
            steps: ["Initiate", "Reviewer Approval", "Final Notification"]
          }
        }
      ],
      affectedModules: [targetModuleKey],
      affectedDeliverables: ["SYSTEM_SPEC", "PROCESS_MAP", "REQUIREMENTS"],
      affectedRuntimeComponents: ["WORKFLOW", "FORM", "API"],
      riskLevel: "MEDIUM",
      requiresApproval: true
    }
  }

  if (p.includes("role") || p.includes("permission") || p.includes("access")) {
    return {
      summary: `Add user access role: ${prompt.slice(0, 30)}`,
      changes: [
        {
          type: "ADD_ROLE",
          role: {
            role: "CUSTOM_ROLE",
            description: prompt,
            permissions: ["view_records", "edit_assigned"]
          }
        }
      ],
      affectedModules: [targetModuleKey],
      affectedDeliverables: ["SYSTEM_SPEC", "STAKEHOLDERS", "SECURITY"],
      affectedRuntimeComponents: ["RBAC", "API"],
      riskLevel: "MEDIUM",
      requiresApproval: true
    }
  }

  // Default: Add Field
  const fieldKey = prompt.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase().slice(0, 20) || "custom_field"
  const fieldLabel = prompt.replace(/^add (a |an )?/i, "").slice(0, 30) || "Custom Field"
  const isSelect = p.includes("source") || p.includes("status") || p.includes("type") || p.includes("category")

  return {
    summary: `Add field '${fieldLabel}' to ${targetModuleKey} module`,
    changes: [
      {
        type: "ADD_FIELD",
        module: targetModuleKey,
        field: {
          name: fieldKey,
          label: fieldLabel,
          type: isSelect ? "select" : "text",
          required: false,
          options: isSelect ? ["Website", "Referral", "Social Media", "Advertisement", "Other"] : undefined
        }
      }
    ],
    affectedModules: [targetModuleKey],
    affectedDeliverables: ["SYSTEM_SPEC", "DATABASE_DESIGN", "API_DESIGN", "REQUIREMENTS"],
    affectedRuntimeComponents: ["FORM", "TABLE", "API", "CSV"],
    riskLevel: "LOW",
    requiresApproval: true
  }
}

/**
 * Deterministically applies an approved Blueprint Delta onto the current Blueprint object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyBlueprintDelta(currentBlueprint: any, delta: BlueprintDelta): any {
  // Deep clone to avoid mutation side effects
  const updated = JSON.parse(JSON.stringify(currentBlueprint || {}))

  if (!updated.modules) updated.modules = []
  if (!updated.dataEntities) updated.dataEntities = []
  if (!updated.workflows) updated.workflows = []
  if (!updated.userRoles) updated.userRoles = []

  for (const change of delta.changes) {
    switch (change.type) {
      case "ADD_MODULE": {
        const modKey = change.module || `mod_${Date.now()}`
        if (!updated.modules.some((m: { key: string }) => m.key === modKey)) {
          updated.modules.push({
            key: modKey,
            name: change.details || modKey.charAt(0).toUpperCase() + modKey.slice(1),
            description: `Custom module added via AI request: ${delta.summary}`
          })
          updated.dataEntities.push({
            name: modKey.charAt(0).toUpperCase() + modKey.slice(1),
            fields: ["id", "name", "status", "created_at"]
          })
        }
        break
      }

      case "REMOVE_MODULE": {
        if (change.module) {
          updated.modules = updated.modules.filter((m: { key: string }) => m.key !== change.module)
          updated.dataEntities = updated.dataEntities.filter((e: { name: string }) =>
            e.name.toLowerCase() !== change.module?.toLowerCase()
          )
        }
        break
      }

      case "ADD_FIELD": {
        if (change.field) {
          const modKey = change.module || updated.modules[0]?.key || "general"
          // Find matching data entity
          let entity = updated.dataEntities.find((e: { name: string }) =>
            e.name.toLowerCase() === modKey.toLowerCase() ||
            e.name.toLowerCase().includes(modKey.toLowerCase())
          )

          if (!entity) {
            entity = {
              name: modKey.charAt(0).toUpperCase() + modKey.slice(1),
              fields: ["id", "name", "status", "created_at"]
            }
            updated.dataEntities.push(entity)
          }

          const newFieldName = change.field.name || change.field.label?.toLowerCase().replace(/[^a-z0-9]/g, "_")
          if (newFieldName && !entity.fields.includes(newFieldName)) {
            entity.fields.push(newFieldName)
          }
        }
        break
      }

      case "REMOVE_FIELD": {
        if (change.field?.name) {
          const modKey = change.module || updated.modules[0]?.key
          const entity = updated.dataEntities.find((e: { name: string }) =>
            e.name.toLowerCase() === modKey?.toLowerCase()
          )
          if (entity && Array.isArray(entity.fields)) {
            entity.fields = entity.fields.filter((f: string) => f !== change.field?.name)
          }
        }
        break
      }

      case "ADD_WORKFLOW": {
        if (change.workflow) {
          updated.workflows.push(change.workflow)
        }
        break
      }

      case "ADD_ROLE": {
        if (change.role) {
          updated.userRoles.push(change.role)
        }
        break
      }

      default: {
        // Safe metadata update
        if (!updated.customizations) updated.customizations = []
        updated.customizations.push({
          type: change.type,
          summary: delta.summary,
          appliedAt: new Date().toISOString()
        })
        break
      }
    }
  }

  return updated
}
