"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/dal";
import { readFields, toFormState } from "@/server/forms/form-errors";
import { getServices } from "@/server/services/container";
import type { FormState } from "@/shared/form-state";
import { createUserSchema, updateUserSchema } from "@/shared/schemas";

// Each action authenticates on its own (requireUser runs outside try/catch so its redirect is not
// swallowed), validates with the same zod schemas as the REST API, calls the same service, and
// revalidates the dashboard so the Server Component re-renders with fresh data in this response.

const OK: FormState = { ok: true };

export async function createUserAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const fields = readFields(formData, ["firstName", "lastName", "email", "password", "status"]);
  // Echoed back on error; the password never is.
  const values = {
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    status: fields.status,
  };

  try {
    await getServices().userService.create(createUserSchema.parse(fields));
  } catch (error) {
    return toFormState(error, values);
  }
  revalidatePath("/dashboard");
  return OK;
}

/** Bound with the target id in the client: updateUserAction.bind(null, user.id). */
export async function updateUserAction(
  userId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user: actor } = await requireUser();
  const fields = readFields(formData, ["firstName", "lastName", "status", "password"]);
  // An empty password field means "keep the current password".
  const { password, ...rest } = fields;
  const input = password ? { ...rest, password } : rest;

  try {
    await getServices().userService.update(actor.id, userId, updateUserSchema.parse(input));
  } catch (error) {
    return toFormState(error, rest);
  }
  revalidatePath("/dashboard");
  return OK;
}

/** Soft delete; bound with the target id like updateUserAction. */
export async function deleteUserAction(userId: string): Promise<FormState> {
  const { user: actor } = await requireUser();

  try {
    await getServices().userService.remove(actor.id, userId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/dashboard");
  return OK;
}
