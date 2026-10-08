import { authenticate } from "@/server/http/auth";
import { withApi } from "@/server/http/handler";
import { parseJsonBody, parseQuery } from "@/server/http/parse";
import { getServices } from "@/server/services/container";
import { createUserSchema, listUsersQuerySchema } from "@/shared/schemas";

export const GET = withApi(async (request) => {
  await authenticate(request);
  const query = parseQuery(request, listUsersQuerySchema);
  return Response.json(await getServices().userService.list(query));
});

export const POST = withApi(async (request) => {
  await authenticate(request);
  const input = await parseJsonBody(request, createUserSchema);
  const user = await getServices().userService.create(input);
  return Response.json({ user }, { status: 201 });
});
