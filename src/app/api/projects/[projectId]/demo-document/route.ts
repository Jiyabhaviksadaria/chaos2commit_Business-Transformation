import { NextResponse } from "next/server"

import { requireProjectAccess } from "@/lib/access"
import { validateDocumentBytes, parseDocument } from "@/lib/intake/documents"
import { recognizeDemoDocument } from "@/lib/demo-document-recognition"
import { AAROHAN_BUSINESS_ANALYSIS, normalizeOutputLanguage } from "@/data/aarohan-business-analysis"

export const runtime = "nodejs"

/**
 * Hackathon demo endpoint.
 *
 * Extracts text from an uploaded document and deterministically decides whether
 * it is the Aarohan demo dataset. It performs NO model inference, makes NO
 * database writes, and simply returns the prebuilt analysis so the existing
 * Business Analysis UI can render it.
 */
export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    await requireProjectAccess(params.projectId, "project:edit")
  } catch (error) {
    if (error instanceof Error && (error.name === "AccessError" || error.name === "AuthError")) {
      const status = error.name === "AuthError" ? 401 : 403
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json({ error: "Unable to verify project access." }, { status: 503 })
  }

  try {
    const formData = await request.formData().catch(() => null)
    const file = formData?.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    const rawFormOutputLanguage = formData?.get("outputLanguage")
    const outputLanguage = normalizeOutputLanguage(
      typeof rawFormOutputLanguage === "string" ? rawFormOutputLanguage : "en",
    )

    const validated = await validateDocumentBytes(file)
    const parsed = await parseDocument(validated)
    const recognition = recognizeDemoDocument(parsed.text)

    if (!recognition.recognized || recognition.demoCompany !== "aarohan") {
      return NextResponse.json({
        recognized: false,
        demoCompany: null,
        inputLanguage: recognition.inputLanguage,
        matchedSignals: recognition.matchedSignals,
        message: recognition.unrecognizedMessage[outputLanguage],
      })
    }

    return NextResponse.json({
      recognized: true,
      demoCompany: "aarohan",
      inputLanguage: recognition.inputLanguage,
      confidence: recognition.confidence,
      matchedSignals: recognition.matchedSignals,
      outputLanguage,
      fileName: file.name,
      companyName: AAROHAN_BUSINESS_ANALYSIS[outputLanguage].company.name,
      analysis: AAROHAN_BUSINESS_ANALYSIS[outputLanguage],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read the document."
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
