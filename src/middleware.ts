import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(request: NextRequest) {
    const userAgent = request.headers.get("user-agent") || "";
    const isMobileApp = userAgent.includes("DigiXCrm-Capacitor-Mobile");
    const { pathname } = request.nextUrl;

    // 1. Force redirect from landing page (/) strictly for the mobile app
    if (isMobileApp && pathname === "/") {
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // 2. Allow public access to all landing pages and onboarding flows on standard browsers
    const publicPaths = ["/", "/download", "/features", "/pricing", "/auth/signin", "/auth/register", "/auth/register-flow", "/auth/setup", "/auth/reset-password"];
    if (publicPaths.some(p => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Root, Landing, and Onboarding pages are PUBLIC
        const publicRoutes = ["/", "/download", "/features", "/pricing", "/auth/signin", "/auth/register", "/auth/register-flow", "/auth/setup", "/auth/reset-password"];
        if (publicRoutes.some(p => pathname.startsWith(p))) {
          return true;
        }

        // Authentication required for everything else (Dashboard, etc.)
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|mobile_app|offline.html).*)",
  ],
};
