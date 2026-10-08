import { authenticate } from "@/server/http/auth";
import { withApi } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/parse";
import { sessionCreatedResponse } from "@/server/http/responses";
import { getServices } from "@/server/services/container";
import { signInSchema } from "@/shared/schemas";

/** Sign in: creating a session is the REST view of "log in". */
export const POST = withApi(async (request) => {
  const input = await parseJsonBody(request, signInSchema);
  const userAgent = request.headers.get("user-agent");
  return sessionCreatedResponse(await getServices().authService.signIn(input, { userAgent }));
});

/** The caller's own active sessions, newest first; `current` marks the one making this request. */
export const GET = withApi(async (request) => {
  const auth = await authenticate(request);
  const sessions = await getServices().sessionService.listActive(auth.user.id);
  return Response.json({
    items: sessions.map(({ id, userAgent, createdAt, expiresAt }) => ({
      id,
      userAgent,
      createdAt,
      expiresAt,
      current: id === auth.session.id,
    })),
  });
});
