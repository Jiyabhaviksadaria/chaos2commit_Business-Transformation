import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { DeliverableType } from "@prisma/client"
import type { SystemSpecData, FieldData } from "@/modules/deliverables/system-spec"

export const runtime = "nodejs"

export interface BlueprintModuleSpec {
  key: string
  name: string
  description: string
  icon: string
  views: string[]
  kanbanField?: string
  fields: FieldData[]
}

async function getModuleSpec(projectId: string, moduleKey: string): Promise<BlueprintModuleSpec | null> {
  // 1. Priority: Try Approved Master Blueprint first
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = await (db.project as any).findUnique({
      where: { id: projectId },
      select: { blueprintData: true }
    })

    if (project?.blueprintData?.modules) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bpModule = project.blueprintData.modules.find((m: any) => m.key === moduleKey || m.key.toLowerCase() === moduleKey.toLowerCase())
      if (bpModule) {
        // Find corresponding data entity fields if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entity = project.blueprintData.dataEntities?.find((e: any) =>
          e.name.toLowerCase() === bpModule.name.toLowerCase() ||
          e.name.toLowerCase().includes(bpModule.key.toLowerCase()) ||
          bpModule.key.toLowerCase().includes(e.name.toLowerCase())
        )

        let fields: FieldData[] = []
        if (entity?.fields && entity.fields.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fields = entity.fields.map((f: any) => {
            const raw = typeof f === "string" ? f : f.name || f.key || "field"
            const fieldKey = raw.toLowerCase().replace(/[^a-z0-9]/g, "_")
            let type: FieldData["type"] = "text"
            if (fieldKey.includes("date") || fieldKey.includes("time")) type = "date"
            else if (fieldKey.includes("amount") || fieldKey.includes("price") || fieldKey.includes("cost") || fieldKey.includes("score")) type = "currency"
            else if (fieldKey.includes("count") || fieldKey.includes("qty") || fieldKey.includes("num")) type = "number"
            else if (fieldKey.includes("is_") || fieldKey.includes("has_") || fieldKey.includes("flag")) type = "boolean"
            else if (fieldKey.includes("status") || fieldKey.includes("stage") || fieldKey.includes("priority")) type = "select"
            else if (fieldKey.includes("email")) type = "email"
            else if (fieldKey.includes("phone")) type = "phone"

            return {
              key: fieldKey,
              label: raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " "),
              type,
              options: type === "select" ? ["ACTIVE", "PENDING", "COMPLETED", "IN_PROGRESS"] : undefined,
              required: fieldKey === "title" || fieldKey === "name",
              showInTable: true
            }
          })
        }

        if (fields.length === 0) {
          fields = [
            { key: "name", label: "Name / Title", type: "text", required: true, showInTable: true },
            { key: "status", label: "Status", type: "select", options: ["ACTIVE", "PENDING", "COMPLETED", "CANCELLED"], required: false, showInTable: true },
            { key: "description", label: "Description", type: "textarea", required: false, showInTable: true },
            { key: "assigned_to", label: "Assigned To", type: "text", required: false, showInTable: true },
            { key: "updated_at", label: "Last Updated", type: "date", required: false, showInTable: true }
          ]
        }

        const hasStatus = fields.some(f => f.key === "status" || f.key.includes("stage"))
        const kanbanField = fields.find(f => f.key === "status" || f.key.includes("stage"))?.key

        return {
          key: bpModule.key,
          name: bpModule.name,
          description: bpModule.description || `Module runtime for ${bpModule.name}`,
          icon: "Box",
          views: hasStatus ? ["table", "kanban"] : ["table"],
          kanbanField,
          fields
        }
      }
    }
  } catch {
    // Fall back to SYSTEM_SPEC
  }

  // 2. Secondary Priority: SYSTEM_SPEC deliverable
  const config = getDeliverableConfig(DeliverableType.SYSTEM_SPEC)
  if (config) {
    const deliverable = await db.deliverable.findFirst({
      where: { projectId, type: DeliverableType.SYSTEM_SPEC },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
    })

    if (deliverable?.versions[0]) {
      const spec = deliverable.versions[0].content as unknown as SystemSpecData
      const found = spec?.modules?.find(m => m.key === moduleKey)
      if (found) return found
    }
  }

  // 3. Fallback: Generic module definition
  return {
    key: moduleKey,
    name: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace(/_/g, " "),
    description: `Generic module runtime for ${moduleKey}`,
    icon: "Box",
    views: ["table"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, showInTable: true },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "PENDING", "COMPLETED"], required: false, showInTable: true },
      { key: "description", label: "Description", type: "textarea", required: false, showInTable: true }
    ]
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; moduleKey: string } }
) {
  try {
    await requireProjectAccess(params.projectId)
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
    const search = searchParams.get("search") ?? ""

    const where = { projectId: params.projectId, moduleKey: params.moduleKey }
    const total = await db.generatedRecord.count({ where })
    let records = await db.generatedRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    if (search) {
      records = records.filter(r => JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()))
    }

    return NextResponse.json({ ok: true, data: records, total, page, pageSize })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; moduleKey: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()

    const mod = await getModuleSpec(params.projectId, params.moduleKey)
    if (!mod) {
      return NextResponse.json({ ok: false, error: "Module schema not found" }, { status: 404 })
    }

    const validated = validateRecord(body, mod.fields)
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 })

    const record = await db.generatedRecord.create({
      data: {
        projectId: params.projectId,
        moduleKey: params.moduleKey,
        data: validated.data as import("@prisma/client").Prisma.InputJsonValue,
        createdById: access.user.id
      }
    })

    return NextResponse.json({ ok: true, data: record })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

function validateRecord(data: unknown, fields: FieldData[]): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Record must be an object" }
  }
  const record = data as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    const value = record[field.key]
    if (field.required && (value === undefined || value === null || value === "")) {
      return { ok: false, error: `Field '${field.label}' is required` }
    }

    if (value !== undefined && value !== null && value !== "") {
      if (field.type === "number" || field.type === "currency") {
        const num = Number(value)
        if (isNaN(num)) return { ok: false, error: `Field '${field.label}' must be a number` }
        result[field.key] = num
      } else if (field.type === "boolean") {
        result[field.key] = Boolean(value)
      } else if (field.type === "select" && field.options && field.options.length > 0 && !field.options.includes(String(value))) {
        result[field.key] = String(value)
      } else {
        result[field.key] = value
      }
    } else {
      result[field.key] = value ?? null
    }
  }

  const merged = { ...(record as Record<string, unknown>), ...result }
  return { ok: true, data: merged }
}
