export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "USER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "USER_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "EMAIL_TAKEN"
  | "PASSWORD_CHANGE_NOT_REQUIRED"
  | "USER_INACTIVE_RENAME"
  | "CANNOT_MODIFY_SELF"
  | "PASSWORD_UNCHANGED";

/**
 * A business-level failure with a stable code. The domain and services know nothing about HTTP;
 * the API maps codes to status codes and the UI maps them to form messages.
 */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
