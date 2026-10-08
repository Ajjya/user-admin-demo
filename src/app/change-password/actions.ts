"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/dal";
import { readFields, toFormState } from "@/server/forms/form-errors";
import { getServices } from "@/server/services/container";
import type { FormState } from "@/shared/form-state";
import { changePasswordFormSchema } from "@/shared/schemas";

export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  // Outside the try: when there is no session it redirects (by throwing), which must not be
  // turned into a form error.
  const { user } = await requireSession();

  try {
    const { newPassword } = changePasswordFormSchema.parse(
      readFields(formData, ["newPassword", "confirmPassword"]),
    );
    await getServices().authService.changeOwnPassword(user.id, newPassword);
  } catch (error) {
    return toFormState(error);
  }
  // The current session stays valid: the user just proved they know the temporary password.
  redirect("/dashboard");
}
