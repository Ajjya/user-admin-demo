import { withApi } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/parse";
import { sessionCreatedResponse } from "@/server/http/responses";
import { getServices } from "@/server/services/container";
import { signInSchema } from "@/shared/schemas";

/** Sign in: creating a session is the REST view of "log in". */
export const POST = withApi(async (request) => {
  const input = await parseJsonBody(request, signInSchema);
  return sessionCreatedResponse(await getServices().authService.signIn(input));
});
