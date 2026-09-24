import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Always allow authenticated users through
  if (token) return NextResponse.next()

  // In local dev with DEMO_MODE=true, bypass auth so the app is accessible without a real login
  if (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true") {
    return NextResponse.next()
  }

  // Not authenticated and not in demo mode → redirect to login
  const loginUrl = new URL("/login", req.url)
  loginUrl.searchParams.set("callbackUrl", req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/",
    "/projects",
    "/projects/:path*",
    "/app",
    "/app/:path*",
    "/admin",
    "/admin/:path*",
  ],
}

