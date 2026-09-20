import { NextResponse, NextRequest } from "next/server"

// Middleware that previously enforced authentication has been disabled.
// All routes are now publicly accessible.
export default function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Keep the matcher to avoid breaking any existing route handling logic.
  // It now simply lets the request pass through.
  matcher: ["/app/:path*", "/admin/:path*", "/projects/:path*"],
};
