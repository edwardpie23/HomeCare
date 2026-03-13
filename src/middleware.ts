import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Protect admin routes — must have role "admin"
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "admin") {
        return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
      }
    }

    // Protect contractor routes
    if (pathname.startsWith("/contractor")) {
      if (token?.role !== "contractor" && token?.role !== "admin") {
        return NextResponse.redirect(new URL("/get-estimate", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // These paths require any auth
        const protectedPaths = ["/admin", "/contractor", "/my-jobs"];
        if (protectedPaths.some((p) => pathname.startsWith(p))) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/contractor/:path*", "/my-jobs"],
};
