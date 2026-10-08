"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookieInAction, setSessionCookieInAction } from "@/server/auth/cookies";
import { getSession } from "@/server/auth/dal";
import { readFields, toFormState } from "@/server/forms/form-errors";
import { getServices } from "@/server/services/container";
import type { FormState } from "@/shared/form-state";
import { signInSchema, signUpFormSchema } from "@/shared/schemas";

// Server Actions are public POST endpoints: each one validates its input on the server, whatever
// the client already checked. Next.js also rejects cross-origin calls (Origin vs Host).

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const fields = readFields(formData, [
    "firstName",
    "lastName",
    "email",
    "password",
    "confirmPassword",
  ]);
  const values = { firstName: fields.firstName, lastName: fields.lastName, email: fields.email };

  try {
    const { firstName, lastName, email, password } = signUpFormSchema.parse(fields);
    const { session } = await getServices().authService.signUp(
      { firstName, lastName, email, password },
      { userAgent: (await headers()).get("user-agent") },
    );
    await setSessionCookieInAction(session);
  } catch (error) {
    return toFormState(error, values);
  }
  // redirect() works by throwing, so it must stay outside the try/catch.
  redirect("/dashboard");
}

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const fields = readFields(formData, ["email", "password"]);
  const values = { email: fields.email };

  let mustChangePassword: boolean;
  try {
    const { session, user } = await getServices().authService.signIn(signInSchema.parse(fields), {
      userAgent: (await headers()).get("user-agent"),
    });
    await setSessionCookieInAction(session);
    mustChangePassword = user.mustChangePassword;
  } catch (error) {
    return toFormState(error, values);
  }
  redirect(mustChangePassword ? "/change-password" : "/dashboard");
}

/** Terminates the session server-side, then drops the cookie, even if the session already ended. */
export async function signOutAction(): Promise<void> {
  const auth = await getSession();
  if (auth) {
    await getServices().sessionService.terminate(auth.session.id, auth.user.id);
  }
  await clearSessionCookieInAction();
  redirect("/sign-in");
}
