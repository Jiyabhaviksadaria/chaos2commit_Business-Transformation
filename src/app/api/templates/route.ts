import { NextResponse } from "next/server"
import { getAllTemplates } from "@/lib/templates/template-registry"

export async function GET() {
  const templates = getAllTemplates()
  return NextResponse.json({ ok: true, templates })
}
