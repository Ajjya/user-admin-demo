import { authenticate } from "@/server/http/auth";
import { withApi } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/parse";
import { getServices } from "@/server/services/container";
import { updateUserSchema } from "@/shared/schemas";

export const PATCH = withApi(async (request, context: RouteContext<"/api/users/[id]">) => {
  const { id } = await context.params;
  const { user: actor } = await authenticate(request);
  const input = await parseJsonBody(request, updateUserSchema);
  const user = await getServices().userService.update(actor.id, id, input);
  return Response.json({ user });
});

export const DELETE = withApi(async (request, context: RouteContext<"/api/users/[id]">) => {
  const { id } = await context.params;
  const { user: actor } = await authenticate(request);
  await getServices().userService.remove(actor.id, id);
  return new Response(null, { status: 204 });
});
