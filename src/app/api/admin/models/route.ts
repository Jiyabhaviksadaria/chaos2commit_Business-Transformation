import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Default model configuration state
let currentModelConfigs = [
  {
    provider: "Google Gemini",
    model: "gemini-1.5-pro",
    status: "PRIMARY",
    temperature: 0.2,
    maxTokens: 8192,
    fallbackPriority: 1,
    creditRate: 1.0,
    apiStatus: "HEALTHY"
  },
  {
    provider: "Google Gemini",
    model: "gemini-1.5-flash",
    status: "SECONDARY",
    temperature: 0.3,
    maxTokens: 4096,
    fallbackPriority: 2,
    creditRate: 0.5,
    apiStatus: "HEALTHY"
  },
  {
    provider: "Groq",
    model: "llama-3.3-70b-versatile",
    status: "FALLBACK",
    temperature: 0.2,
    maxTokens: 4096,
    fallbackPriority: 3,
    creditRate: 0.8,
    apiStatus: "HEALTHY"
  },
  {
    provider: "Mock AI Engine",
    model: "offline-mock-v1",
    status: "OFFLINE_SAFEGUARD",
    temperature: 0.0,
    maxTokens: 2048,
    fallbackPriority: 4,
    creditRate: 0.0,
    apiStatus: "READY"
  }
]

export async function GET() {
  return NextResponse.json({
    ok: true,
    models: currentModelConfigs
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.models && Array.isArray(body.models)) {
      currentModelConfigs = body.models
    }
    return NextResponse.json({
      ok: true,
      message: "AI model configuration updated successfully",
      models: currentModelConfigs
    })
  } catch (error) {
    console.error("Admin models error:", error)
    return NextResponse.json({ error: "Failed to update AI model configuration" }, { status: 500 })
  }
}
