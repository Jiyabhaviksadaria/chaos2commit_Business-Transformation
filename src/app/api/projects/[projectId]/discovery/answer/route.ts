import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const AnswerBodySchema = z.object({
  answers: z.array(
    z.object({
      category: z.string(),
      question: z.string(),
      answer: z.string()
    })
  )
})

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const project = access.project

    const body = await req.json()
    const parsed = AnswerBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid answer payload" }, { status: 400 })
    }

    const { answers } = parsed.data

    if (answers.length === 0) {
      return NextResponse.json({ error: "No answers provided" }, { status: 400 })
    }

    // Format Q&A as appendable text
    const qaFormatted = answers
      .map(a => `[${a.category.toUpperCase()}] Q: ${a.question}\nA: ${a.answer}`)
      .join("\n\n")

    const updatedContext = project.businessContext
      ? `${project.businessContext}\n\n--- DISCOVERY ANSWERS (${new Date().toLocaleDateString()}) ---\n${qaFormatted}`
      : `--- DISCOVERY ANSWERS (${new Date().toLocaleDateString()}) ---\n${qaFormatted}`

    // Calculate score increment based on number of answered questions
    const currentCompleteness = project.discoveryCompleteness ?? 50
    const newCompleteness = Math.min(100, currentCompleteness + answers.length * 10)
    const newDigitalMaturity = Math.min(100, (project.digitalMaturity ?? 60) + Math.round(answers.length * 4))
    const newAiReadiness = Math.min(100, (project.aiReadiness ?? 65) + Math.round(answers.length * 5))

    const updatedProject = await db.project.update({
      where: { id: params.projectId },
      data: {
        businessContext: updatedContext,
        discoveryCompleteness: newCompleteness,
        digitalMaturity: newDigitalMaturity,
        aiReadiness: newAiReadiness
      }
    })

    return NextResponse.json({
      success: true,
      discoveryCompleteness: updatedProject.discoveryCompleteness,
      digitalMaturity: updatedProject.digitalMaturity,
      aiReadiness: updatedProject.aiReadiness,
      businessContext: updatedProject.businessContext
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
