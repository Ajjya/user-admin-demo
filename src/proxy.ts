import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/cookies";

// Optimistic redirects only: checks whether the session cookie EXISTS, never whether it is valid.
// Proxy runs on every matched request (prefetches included), so it must not hit the database.
// The real check is the DAL (server/auth/dal.ts) in every page and Server Action.

const PROTECTED_PAGES = ["/dashboard", "/change-password"];
const SIGNED_OUT_PAGES = ["/sign-in", "/sign-up"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  if (PROTECTED_PAGES.includes(pathname) && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // "/sign-in?expired=1" is where the DAL sends a stale cookie; redirecting it to /dashboard
  // again would loop forever.
  const isExpiredNotice = pathname === "/sign-in" && searchParams.has("expired");
  if (SIGNED_OUT_PAGES.includes(pathname) && hasSessionCookie && !isExpiredNotice) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/change-password", "/sign-in", "/sign-up"],
};
