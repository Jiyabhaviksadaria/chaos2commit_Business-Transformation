import { NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseConfigured = Boolean(env.DATABASE_URL);
  let databaseReachable = false;
  let databaseError: string | undefined;

  if (databaseConfigured) {
    try {
      await db.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Database connection failed";
      console.error("Health check database failure:", error);
    }
  }

  const healthy = databaseConfigured && databaseReachable;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "unhealthy",
      database: {
        configured: databaseConfigured,
        reachable: databaseReachable,
        ...(databaseError ? { error: databaseError } : {}),
      },
      authUrl: env.NEXTAUTH_URL,
      ai: {
        groq: Boolean(env.GROQ_API_KEY),
        gemini: Boolean(env.GEMINI_API_KEY),
        mock: env.AI_MOCK === "true",
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
