import { NextResponse } from "next/server"
import { getTemplateById } from "@/lib/templates/template-registry"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const template = getTemplateById(params.id)
  if (!template) {
    return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true, template })
}
