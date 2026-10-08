import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE } from "@/server/auth/cookies";
import { getServices } from "@/server/services/container";
import type { AuthenticatedSession } from "@/server/services/session-service";

// Data Access Layer: the real authorization boundary for pages and Server Actions (proxy.ts only
// does an optimistic cookie check). Like a NestJS AuthGuard, but called explicitly.

/**
 * Verifies the session cookie against the database. React `cache` memoizes it per request, so a
 * layout, a page and its components can all call it while the database is queried once.
 */
export const getSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  return sessionId ? getServices().sessionService.getActiveSession(sessionId) : null;
});

export async function requireSession(): Promise<AuthenticatedSession> {
  const auth = await getSession();
  if (!auth) {
    // A cookie that no longer maps to an active session (expired, logged out elsewhere, user
    // deactivated). proxy.ts lets this URL through even with the stale cookie, which prevents a
    // redirect loop; the next sign-in overwrites the cookie.
    const hasCookie = (await cookies()).has(SESSION_COOKIE);
    redirect(hasCookie ? "/sign-in?expired=1" : "/sign-in");
  }
  return auth;
}

/** For pages that only make sense signed out (sign-in, sign-up). */
export async function requireNoSession(): Promise<void> {
  if (await getSession()) {
    redirect("/dashboard");
  }
}

/**
 * For every page except /change-password: a user holding an admin-set temporary password must
 * replace it before doing anything else.
 */
export async function requireUser(): Promise<AuthenticatedSession> {
  const auth = await requireSession();
  if (auth.user.mustChangePassword) {
    redirect("/change-password");
  }
  return auth;
}
