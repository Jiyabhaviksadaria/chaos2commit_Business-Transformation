import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { DeliverableType } from "@prisma/client"
import type { SystemSpecData } from "@/modules/deliverables/system-spec"

export const runtime = "nodejs"

async function getModuleSpec(projectId: string, moduleKey: string) {
  const config = getDeliverableConfig(DeliverableType.SYSTEM_SPEC)
  if (!config) return null

  const deliverable = await db.deliverable.findFirst({
    where: { projectId, type: DeliverableType.SYSTEM_SPEC },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
  })

  if (!deliverable?.versions[0]) return null
  const spec = deliverable.versions[0].content as unknown as SystemSpecData
  return spec?.modules?.find(m => m.key === moduleKey) ?? null
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

    // Client-side search filter on data fields
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

    // Validate against the current spec
    const mod = await getModuleSpec(params.projectId, params.moduleKey)
    if (!mod) {
      return NextResponse.json({ ok: false, error: "Module not found in spec" }, { status: 404 })
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

function validateRecord(data: unknown, fields: SystemSpecData["modules"][0]["fields"]): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
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

    // Basic type coercion and validation
    if (value !== undefined && value !== null && value !== "") {
      if (field.type === "number" || field.type === "currency") {
        const num = Number(value)
        if (isNaN(num)) return { ok: false, error: `Field '${field.label}' must be a number` }
        result[field.key] = num
      } else if (field.type === "boolean") {
        result[field.key] = Boolean(value)
      } else if (field.type === "select" && field.options && !field.options.includes(String(value))) {
        return { ok: false, error: `Field '${field.label}' must be one of: ${field.options.join(", ")}` }
      } else {
        result[field.key] = value
      }
    } else {
      result[field.key] = value ?? null
    }
  }

  // Merge validated fields with original record (preserving extra keys)
  const merged = { ...(record as Record<string, unknown>), ...result }
  return { ok: true, data: merged }
}
