import { z } from "zod";

const isServer = typeof window === "undefined";
const isProduction = process.env.NODE_ENV === "production";

function inferAuthUrl(): string {
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const renderHostname = process.env.RENDER_EXTERNAL_HOSTNAME;

  if (vercelProductionUrl) return `https://${vercelProductionUrl}`;
  if (vercelUrl) return `https://${vercelUrl}`;
  if (renderHostname) return `https://${renderHostname}`;

  return "http://localhost:3000";
}

const inferredAuthUrl = inferAuthUrl();
if (isServer && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = inferredAuthUrl;
}

const envSchema = z.object({
  DATABASE_URL: z.string().optional().default(
    isProduction ? "" : "postgresql://postgres:postgres@localhost:5432/intelly",
  ),
  NEXTAUTH_SECRET: z.string().optional().default(
    isProduction ? "" : "demo-secret-key-for-development-only-12345",
  ),
  NEXTAUTH_URL: z.string().optional().default(inferredAuthUrl),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional().default("qwen/qwen3.8-27b:free"),
  AI_MOCK: z.enum(["true", "false"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  RENDER_API_KEY: z.string().optional(),
  DEMO_MODE: z.enum(["true", "false"]).optional(),
  // Email / SMTP — server-side only, never NEXT_PUBLIC_
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default("587"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  APP_URL: z.string().optional().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && isServer && process.env.NODE_ENV !== "test" && process.env.SKIP_ENV_VALIDATION !== "true") {
  console.warn("Environment variable validation warning:", parsed.error.format());
}

export const env = parsed.success
  ? parsed.data
  : {
      DATABASE_URL: process.env.DATABASE_URL || (isProduction ? "" : "postgresql://postgres:postgres@localhost:5432/intelly"),
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || (isProduction ? "" : "demo-secret-key-for-development-only-12345"),
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || inferredAuthUrl,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "qwen/qwen3.8-27b:free",
      AI_MOCK: process.env.AI_MOCK,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_ID: process.env.GITHUB_ID,
      GITHUB_SECRET: process.env.GITHUB_SECRET,
      VERCEL_TOKEN: process.env.VERCEL_TOKEN,
      RENDER_API_KEY: process.env.RENDER_API_KEY,
      DEMO_MODE: process.env.DEMO_MODE,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT || "587",
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      MAIL_FROM: process.env.MAIL_FROM,
      APP_URL: process.env.APP_URL || "http://localhost:3000",
    };
