import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function middleware(req: Request) {
  const token = await getToken({ req: req as Parameters<typeof getToken>[0]["req"], secret: process.env.NEXTAUTH_SECRET })
  if (token || (process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true")) return NextResponse.next()
  const loginUrl = new URL("/login", req.url)
  loginUrl.searchParams.set("callbackUrl", req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/projects/:path*"],
}
