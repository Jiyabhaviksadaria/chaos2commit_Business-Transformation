import { NextResponse } from "next/server";
import { env } from "@/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDb = !!env.DATABASE_URL;

  return NextResponse.json({
    status: "ok",
    db: hasDb,
    ai: {
      groq: !!env.GROQ_API_KEY,
      gemini: !!env.GEMINI_API_KEY,
      mock: env.AI_MOCK === "true",
    },
  });
}
