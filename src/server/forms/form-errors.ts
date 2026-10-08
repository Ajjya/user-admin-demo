import "server-only";
import { ZodError } from "zod";
import { DomainError, type ErrorCode } from "@/domain/errors";
import { logger } from "@/server/logger";
import type { FormState } from "@/shared/form-state";

/** Domain errors that belong next to a specific input; everything else is shown above the form. */
const FIELD_BY_CODE: Partial<Record<ErrorCode, string>> = {
  EMAIL_TAKEN: "email",
  PASSWORD_UNCHANGED: "newPassword",
  USER_INACTIVE_RENAME: "firstName",
};

/**
 * Reads only the expected fields. Next.js adds its own hidden `$ACTION_*` inputs to forms, so
 * Object.fromEntries(formData) would fail the strict schemas.
 */
export function readFields(formData: FormData, names: readonly string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === "string") {
      fields[name] = value;
    }
  }
  return fields;
}

/** Maps a failed action to form state. The Server Action equivalent of withApi. */
export function toFormState(error: unknown, values?: Record<string, string>): FormState {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors, values };
  }
  if (error instanceof DomainError) {
    const field = FIELD_BY_CODE[error.code];
    return field
      ? { fieldErrors: { [field]: error.message }, values }
      : { formError: error.message, values };
  }
  logger.error({ err: error }, "Unhandled error in Server Action");
  return { formError: "Something went wrong. Please try again.", values };
}
