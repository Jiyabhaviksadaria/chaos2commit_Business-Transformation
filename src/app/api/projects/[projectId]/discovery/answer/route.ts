import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { appendProjectContextAnswers } from "@/lib/ai/context"
import { z } from "zod"

export const runtime = "nodejs"

const AnswerSchema = z.object({
  questionId: z.string().trim().max(120).optional(),
  category: z.string().trim().min(1).max(120).default("General"),
  question: z.string().trim().min(1).max(2_000),
  answer: z.string().trim().min(1).max(10_000),
})
const AnswerBodySchema = z.object({ answers: z.array(AnswerSchema).min(1).max(6) })

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const parsed = AnswerBodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Provide at least one non-empty answer." }, { status: 400 })

    const answers = parsed.data.answers
    const qaFormatted = answers.map((answer) => `[${answer.category.toUpperCase()}] Q: ${answer.question}\nA: ${answer.answer}`).join("\n\n")
    const currentContext = access.project.businessContext || ""
    const contextDelegate = (db as unknown as { projectContext?: { update?: unknown } }).projectContext
    let updatedContext = currentContext
    // Persist canonical answers when the ProjectContext table is available.
    // The legacy text field is updated only for older installations that do
    // not have the unified context delegate.
    let contextPersisted = false
    if (typeof contextDelegate?.update === "function") {
      try {
        await appendProjectContextAnswers(params.projectId, answers as unknown as Array<Record<string, unknown>>)
        contextPersisted = true
      } catch (error) {
        console.warn("Answer context persistence failed:", error)
      }
    }
    if (!contextPersisted) {
      updatedContext = `${currentContext}${currentContext ? "\n\n" : ""}--- DISCOVERY ANSWERS (${new Date().toISOString()}) ---\n${qaFormatted}`
    }

    const sourceCount = await db.document.count({ where: { projectId: params.projectId, status: "READY" } }).catch(() => 0)
    const currentCompleteness = access.project.discoveryCompleteness ?? 0
    const newCompleteness = Math.min(100, currentCompleteness + answers.length * 10)
    const newDigitalMaturity = Math.min(100, (access.project.digitalMaturity ?? 0) + Math.min(5, sourceCount))
    const newAiReadiness = Math.min(100, (access.project.aiReadiness ?? 0) + Math.min(5, answers.length * 2))

    const updatedProject = await db.project.update({
      where: { id: params.projectId },
      data: {
        businessContext: updatedContext,
        discoveryCompleteness: newCompleteness,
        digitalMaturity: newDigitalMaturity,
        aiReadiness: newAiReadiness,
      },
    })

    return NextResponse.json({
      success: true,
      savedAnswers: answers.length,
      discoveryCompleteness: updatedProject.discoveryCompleteness,
      digitalMaturity: updatedProject.digitalMaturity,
      aiReadiness: updatedProject.aiReadiness,
      businessContext: updatedProject.businessContext,
    })
  } catch (error) {
    console.error("POST discovery answers failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to save discovery answers." }, { status })
  }
}
