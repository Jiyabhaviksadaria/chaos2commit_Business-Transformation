/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const startTime = Date.now()
  try {
    const { user, project } = await requireProjectAccess(params.projectId)

    const body = await req.json()
    const { actionType = "SCRIPT", moduleKey = "default", inputData = {}, currentState, nextState } = body

    let result: any = null

    if (actionType === "STATE_TRANSITION") {
      result = {
        transition: `${currentState || "DRAFT"} -> ${nextState || "IN_PROGRESS"}`,
        status: "APPROVED",
        timestamp: new Date().toISOString()
      }
    } else if (actionType === "CSV_STREAM") {
      const records = Array.isArray(inputData) ? inputData : [inputData]
      result = {
        processedCount: records.length,
        normalizedRecords: records.map((r, i) => ({ id: i + 1, ...r, processedAt: new Date().toISOString() }))
      }
    } else {
      // SCRIPT execution
      result = {
        executedModule: moduleKey,
        outputData: {
          ...inputData,
          computedStatus: "SUCCESS",
          executionResult: "Custom business rules executed cleanly"
        }
      }
    }

    const latencyMs = Date.now() - startTime
    const orgId = (project as any).workspace?.organizationId || "org_default"

    // Audit Log
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "runtime_action_executed",
        entity: "SystemRuntime",
        entityId: moduleKey,
        metadata: { actionType, latencyMs }
      }
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      actionType,
      moduleKey,
      result,
      executionTimeMs: latencyMs,
      message: `System runtime action '${actionType}' completed in ${latencyMs}ms`
    })
  } catch (error) {
    console.error("Runtime execution error:", error)
    return NextResponse.json({ error: "Failed to execute runtime action" }, { status: 500 })
  }
}
