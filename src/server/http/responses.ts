import "server-only";
import { NextResponse } from "next/server";
import { toPublicUser } from "@/domain/user";
import { setSessionCookie } from "@/server/auth/cookies";
import type { AuthenticatedSession } from "@/server/services/session-service";

/**
 * Sign-up and sign-in answer the same way: the session id in the body (for Bearer clients) and
 * in the httpOnly cookie (for browsers).
 */
export function sessionCreatedResponse({ session, user }: AuthenticatedSession): NextResponse {
  const response = NextResponse.json(
    { sessionId: session.id, expiresAt: session.expiresAt, user: toPublicUser(user) },
    { status: 201 },
  );
  setSessionCookie(response, session);
  return response;
}
