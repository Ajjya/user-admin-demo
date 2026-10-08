import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth/cookies";
import { authenticate } from "@/server/http/auth";
import { withApi } from "@/server/http/handler";
import { getServices } from "@/server/services/container";

/** Log out: terminates one of the caller's own sessions. */
export const DELETE = withApi(async (request, context: RouteContext<"/api/sessions/[id]">) => {
  const { id } = await context.params;
  const auth = await authenticate(request, { allowPendingPasswordChange: true });
  await getServices().sessionService.terminate(id, auth.user.id);

  const response = new NextResponse(null, { status: 204 });
  if (id === auth.session.id) {
    clearSessionCookie(response);
  }
  return response;
});
