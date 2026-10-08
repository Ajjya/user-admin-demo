import "server-only";
import type { NextResponse } from "next/server";
import type { Session } from "@/domain/session";

export const SESSION_COOKIE = "sid";

interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  expires: Date;
}

/**
 * httpOnly: JavaScript can never read the session id (XSS cannot steal it).
 * sameSite=lax: not sent on cross-site POSTs (CSRF), still sent on normal link navigation.
 * expires = session.expiresAt: the browser drops the cookie when the session expires.
 * Shared by Route Handlers (NextResponse.cookies) and Server Actions (cookies()).
 */
export function sessionCookieOptions(session: Session): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  };
}

export function setSessionCookie(response: NextResponse, session: Session): void {
  response.cookies.set(SESSION_COOKIE, session.id, sessionCookieOptions(session));
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE);
}
