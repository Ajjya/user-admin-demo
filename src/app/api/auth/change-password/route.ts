import { toPublicUser } from "@/domain/user";
import { authenticate } from "@/server/http/auth";
import { withApi } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/parse";
import { getServices } from "@/server/services/container";
import { changePasswordSchema } from "@/shared/schemas";

/** Replaces an admin-set temporary password; the only user endpoint allowed while one is pending. */
export const POST = withApi(async (request) => {
  const { user } = await authenticate(request, { allowPendingPasswordChange: true });
  const { newPassword } = await parseJsonBody(request, changePasswordSchema);
  const updated = await getServices().authService.changeOwnPassword(user.id, newPassword);
  return Response.json({ user: toPublicUser(updated) });
});
