import "server-only";
import type { NextRequest } from "next/server";
import { DomainError } from "@/domain/errors";
import { SESSION_COOKIE } from "@/server/auth/cookies";
import { getServices } from "@/server/services/container";
import type { AuthenticatedSession } from "@/server/services/session-service";

const BEARER_PREFIX = /^Bearer\s+(.+)$/i;

/** Non-browser clients send a Bearer token; the browser sends the httpOnly cookie. */
function readSessionId(request: NextRequest): string | undefined {
  const header = request.headers.get("authorization");
  const bearer = header ? BEARER_PREFIX.exec(header)?.[1]?.trim() : undefined;
  return bearer ?? request.cookies.get(SESSION_COOKIE)?.value;
}

/**
 * The API's equivalent of the DAL: verifies the session against the database on every call.
 * A user with a pending temporary password may only call the endpoints that opt in.
 */
export async function authenticate(
  request: NextRequest,
  options: { allowPendingPasswordChange?: boolean } = {},
): Promise<AuthenticatedSession> {
  const sessionId = readSessionId(request);
  const auth = sessionId ? await getServices().sessionService.getActiveSession(sessionId) : null;
  if (!auth) {
    throw new DomainError("UNAUTHENTICATED", "Authentication required");
  }
  if (auth.user.mustChangePassword && !options.allowPendingPasswordChange) {
    throw new DomainError("PASSWORD_CHANGE_REQUIRED", "You must change your password first");
  }
  return auth;
}
