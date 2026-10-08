"use server";

import { revalidatePath } from "next/cache";
import { DomainError } from "@/domain/errors";
import { requireUser } from "@/server/auth/dal";
import { getServices } from "@/server/services/container";

/** Bound with the session id in the page: revokeSessionAction.bind(null, session.id). */
export async function revokeSessionAction(sessionId: string): Promise<void> {
  const { user } = await requireUser();
  try {
    // The service only terminates the caller's own sessions.
    await getServices().sessionService.terminate(sessionId, user.id);
  } catch (error) {
    // Already gone (revoked elsewhere or purged by the TTL index): the list refresh shows that.
    if (!(error instanceof DomainError && error.code === "SESSION_NOT_FOUND")) {
      throw error;
    }
  }
  revalidatePath("/sessions");
}
