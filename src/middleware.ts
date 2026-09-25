import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  const isApiRequest = req.nextUrl.pathname.startsWith("/api/")

  if (token) {
    const isDemo = Boolean(token.isDemo)
    const isReadOnlyRequest = ["GET", "HEAD", "OPTIONS"].includes(req.method)
    if (isDemo && !isReadOnlyRequest) {
      return NextResponse.json({ error: "This action isn't available in Demo Mode. Sign in with a real account to continue." }, { status: 403 })
    }
    return NextResponse.next()
  }

  // Not authenticated → return JSON for APIs and redirect page requests to login
  if (isApiRequest) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }
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
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/api/projects",
    "/api/projects/:path*",
    "/api/demo/:path*",
    "/api/billing",
    "/api/billing/:path*",
    "/api/intake/:path*",
    "/api/admin/:path*",
    "/api/sites/:path*",
    "/api/notifications/:path*",
  ],
}

