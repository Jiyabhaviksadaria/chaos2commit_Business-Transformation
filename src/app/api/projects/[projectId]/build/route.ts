import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { generateStructured } from "@/lib/ai/orchestrator"
import { generateMultilingualWebsite } from "@/lib/ai/groq-qwen"
import { buildProjectContext } from "@/lib/ai/context"
import { getDeliverableConfig } from "@/modules/registry"
import { DeliverableType, VersionSource, OrgPlan } from "@prisma/client"
import { deductCredits, refundCredits } from "@/lib/billing/credits"
import { PLAN_LIMITS, CREDIT_COSTS } from "@/lib/billing/config"
import { sanitizeSystemSpec } from "@/modules/deliverables/system-spec"
import type { SystemSpecData } from "@/modules/deliverables/system-spec"
import { HR_SYSTEM_FIXTURE } from "@/modules/fixtures/hr-fixtures"

export const runtime = "nodejs"

const BuildSchema = z.object({
  systemIds: z.array(z.string()).min(1),
  language: z.string().default("en")
})

async function upsertDeliverable(
  tx: Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  projectId: string,
  type: DeliverableType,
  content: unknown,
  language: string,
  userId: string,
  note?: string
) {
  let deliverable = await tx.deliverable.findFirst({ where: { projectId, type } })
  if (!deliverable) {
    deliverable = await tx.deliverable.create({
      data: { projectId, type, title: type.replace(/_/g, " "), status: "DRAFT" }
    })
  }
  const count = await tx.deliverableVersion.count({ where: { deliverableId: deliverable.id } })
  const version = await tx.deliverableVersion.create({
    data: {
      deliverableId: deliverable.id,
      versionNumber: count + 1,
      content: content as import("@prisma/client").Prisma.InputJsonValue,
      source: VersionSource.AI,
      language,
      createdById: userId,
      note: note ?? "AI Generated"
    }
  })
  await tx.deliverable.update({ where: { id: deliverable.id }, data: { currentVersionId: version.id } })
  return { deliverable, version }
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()
    const parse = BuildSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ ok: false, error: parse.error.format() }, { status: 400 })

    const { language } = parse.data
    const orgId = access.project.workspace.organizationId

    // Check plan limits
    const org = await db.organization.findUnique({ where: { id: orgId } })
    if (!org) return NextResponse.json({ ok: false, error: "Org not found" }, { status: 400 })
    const limit = PLAN_LIMITS[org.plan as OrgPlan]?.maxWorkableSystems ?? 2

    const existingBuilt = await db.deliverable.count({
      where: { projectId: params.projectId, type: DeliverableType.SYSTEM_SPEC }
    })
    if (existingBuilt > 0) {
      // Already built, allow rebuild
    }

    // Check workable system count across org projects
    const builtCount = await db.deliverable.count({
      where: {
        project: { workspace: { organizationId: orgId } },
        type: DeliverableType.SYSTEM_SPEC
      }
    })
    if (builtCount >= limit && existingBuilt === 0) {
      return NextResponse.json({ ok: false, error: `Plan limit reached: ${limit} workable systems on ${org.plan} plan` }, { status: 403 })
    }

    // Deduct credits
    const refId = `build_${params.projectId}_${Date.now()}`
    const deduct = await deductCredits({
      organizationId: orgId,
      userId: access.user.id,
      amount: CREDIT_COSTS.BUILD_SYSTEMS,
      reason: "Build workable systems",
      refType: "BUILD",
      refId
    })
    if (!deduct.ok) return NextResponse.json({ ok: false, error: deduct.error.message }, { status: 402 })

    const context = await buildProjectContext(params.projectId)
    const results: Record<string, "success" | "failed"> = {}

    // Phase 1: Build SYSTEM_SPEC
    try {
      const config = getDeliverableConfig(DeliverableType.SYSTEM_SPEC)!
      const aiResult = await generateStructured({
        task: "SYSTEM_SPEC",
        system: config.systemPrompt,
        user: config.buildUserPrompt(context),
        schema: config.outputSchema,
        language,
        userId: access.user.id,
        organizationId: orgId
      })

      let specData: SystemSpecData
      if (aiResult.ok) {
        specData = sanitizeSystemSpec(aiResult.data.data)
      } else {
        specData = sanitizeSystemSpec(HR_SYSTEM_FIXTURE)
      }

      await db.$transaction(async (tx) => {
        await upsertDeliverable(tx, params.projectId, DeliverableType.SYSTEM_SPEC, specData, language, access.user.id)
      })
      results.SYSTEM_SPEC = "success"
    } catch {
      results.SYSTEM_SPEC = "failed"
    }

    // Phase 2: Build WEBSITE_SPEC through the dedicated Qwen website service.
    try {
      const primaryLanguage = access.project.primaryLanguage || access.project.language || language
      const supportedLanguages = Array.from(new Set([primaryLanguage, language, ...(access.project.supportedLanguages || [])]))
      const websiteResult = await generateMultilingualWebsite({
        context,
        primaryLanguage,
        supportedLanguages,
        userId: access.user.id,
        organizationId: orgId,
      })
      if (!websiteResult.ok) throw new Error(websiteResult.error.message)
      const websiteData = websiteResult.data.data
      await db.$transaction(async (tx) => {
        await upsertDeliverable(tx, params.projectId, DeliverableType.WEBSITE_SPEC, websiteData, language, access.user.id)
      })
      results.WEBSITE_SPEC = "success"
    } catch {
      results.WEBSITE_SPEC = "failed"
    }

    // Phase 3: Generate sample data (5-8 records per module) if SYSTEM_SPEC succeeded
    if (results.SYSTEM_SPEC === "success") {
      try {
        const specDeliverable = await db.deliverable.findFirst({
          where: { projectId: params.projectId, type: DeliverableType.SYSTEM_SPEC },
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
        })
        const spec = specDeliverable?.versions[0]?.content as unknown as SystemSpecData
        if (spec?.modules) {
          for (const mod of spec.modules.slice(0, 4)) {
            // Insert fixture sample data
            const sampleRecords = generateSampleRecords(mod)
            for (const record of sampleRecords) {
              await db.generatedRecord.create({
                data: {
                  projectId: params.projectId,
                  moduleKey: mod.key,
                  data: record as import("@prisma/client").Prisma.InputJsonValue,
                  createdById: access.user.id
                }
              })
            }
          }
        }
        results.SAMPLE_DATA = "success"
      } catch {
        results.SAMPLE_DATA = "failed"
      }
    }

    const allFailed = Object.values(results).every(v => v === "failed")
    if (allFailed) {
      await refundCredits({ organizationId: orgId, userId: access.user.id, amount: CREDIT_COSTS.BUILD_SYSTEMS, reason: "Build failed refund", refType: "REFUND", originalRefId: refId })
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 })
  }
}

function generateSampleRecords(mod: SystemSpecData["modules"][0]): Record<string, unknown>[] {
  const samples: Record<string, unknown>[] = []
  const count = 5

  const nameSeeds = {
    candidates: ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Singh", "Vikram Mehta"],
    clients: ["TechCorp India", "FinServ Ltd", "RetailX", "BuildRight Construction", "MedPlus Healthcare"],
    attendance: ["", "", "", "", ""],
    onboarding: ["ABC Pharma", "XYZ Retail", "DEF Logistics", "GHI Tech", "JKL Finance"]
  } as Record<string, string[]>

  const stageSeeds: Record<string, string[]> = {
    candidates: ["Applied", "Screening", "Interview", "Offer", "Placed"],
    clients: ["Prospect", "Active", "Active", "On Hold", "Active"],
    onboarding: ["Agreement", "KYC", "Requirements Gathering", "Setup", "Go Live"]
  }

  for (let i = 0; i < count; i++) {
    const record: Record<string, unknown> = {}
    for (const field of mod.fields) {
      if (field.type === "text" || field.type === "email" || field.type === "phone") {
        const names = nameSeeds[mod.key]
        if (field.key === "name" || field.key.includes("name")) {
          record[field.key] = names?.[i] ?? `Sample ${i + 1}`
        } else if (field.type === "email") {
          record[field.key] = `contact${i + 1}@example.com`
        } else if (field.type === "phone") {
          record[field.key] = `+91 98765 ${(43210 + i).toString()}`
        } else {
          record[field.key] = `Sample ${field.label} ${i + 1}`
        }
      } else if (field.type === "select" && field.options?.length) {
        const stages = stageSeeds[mod.key]
        record[field.key] = stages?.[i] ?? field.options[i % field.options.length]
      } else if (field.type === "currency" || field.type === "number") {
        record[field.key] = [45000, 55000, 65000, 40000, 75000][i]
      } else if (field.type === "date") {
        const d = new Date()
        d.setDate(d.getDate() - i * 5)
        record[field.key] = d.toISOString().slice(0, 10)
      } else if (field.type === "boolean") {
        record[field.key] = i % 2 === 0
      } else if (field.type === "textarea") {
        record[field.key] = `Notes for record ${i + 1}`
      }
    }
    samples.push(record)
  }
  return samples
}
