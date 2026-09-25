import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Keep the pooled Neon endpoint and credentials untouched while giving the
 * Prisma query engine explicit runtime defaults. The defaults address cold
 * starts and short-lived pool waits without logging the connection string.
 */
function withConnectionDefaults(databaseUrl: string): string {
  const defaults: string[] = [];
  if (!/[?&]connect_timeout=/.test(databaseUrl)) defaults.push("connect_timeout=15");
  if (!/[?&]pool_timeout=/.test(databaseUrl)) defaults.push("pool_timeout=20");
  if (defaults.length === 0) return databaseUrl;

  const separator = databaseUrl.includes("?")
    ? databaseUrl.endsWith("?") || databaseUrl.endsWith("&")
      ? ""
      : "&"
    : "?";

  return `${databaseUrl}${separator}${defaults.join("&")}`;
}

function createPrismaClient() {
  const databaseUrl = env.DATABASE_URL;

  return new PrismaClient({
    // Pass the validated runtime value explicitly so every Next route uses the
    // same datasource instead of relying on ambient env resolution.
    ...(databaseUrl
      ? { datasources: { db: { url: withConnectionDefaults(databaseUrl) } } }
      : {}),
    log:
      process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
