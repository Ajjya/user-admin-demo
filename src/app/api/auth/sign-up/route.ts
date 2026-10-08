import { withApi } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/parse";
import { sessionCreatedResponse } from "@/server/http/responses";
import { getServices } from "@/server/services/container";
import { signUpSchema } from "@/shared/schemas";

export const POST = withApi(async (request) => {
  const input = await parseJsonBody(request, signUpSchema);
  const userAgent = request.headers.get("user-agent");
  return sessionCreatedResponse(await getServices().authService.signUp(input, { userAgent }));
});
