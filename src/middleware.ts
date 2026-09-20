import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Admin routes: PLATFORM_ADMIN only
    if (req.nextUrl.pathname.startsWith("/admin") && req.nextauth.token?.role !== "PLATFORM_ADMIN") {
      return NextResponse.redirect(new URL("/projects", req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  // Protect app shell, admin, and project routes
  matcher: ["/app/:path*", "/admin/:path*", "/projects/:path*"],
}
