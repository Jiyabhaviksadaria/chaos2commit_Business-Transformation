import { db } from "@/lib/db"
import { AiTaskStatus } from "@prisma/client"

export async function logAiUsage(opts: {
  userId?: string
  organizationId?: string
  provider: string
  model: string
  task: string
  latencyMs: number
  status: AiTaskStatus
  error?: string
  promptTokens?: number
  completionTokens?: number
}) {
  try {
    await db.aiUsage.create({
      data: {
        userId: opts.userId,
        organizationId: opts.organizationId,
        provider: opts.provider,
        model: opts.model,
        task: opts.task,
        latencyMs: Math.round(opts.latencyMs),
        status: opts.status,
        error: opts.error,
        promptTokens: opts.promptTokens,
        completionTokens: opts.completionTokens,
      },
    })
  } catch (error) {
    // Fail silently so logging failures don't crash the application
    console.error("[AiUsage] Failed to log usage:", error)
  }
}
