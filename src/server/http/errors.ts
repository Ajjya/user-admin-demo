import "server-only";
import type { ErrorCode } from "@/domain/errors";

/** Codes that only exist at the HTTP edge, never in the domain. */
export type ApiErrorCode = ErrorCode | "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  USER_INACTIVE: 403,
  PASSWORD_CHANGE_REQUIRED: 403,
  USER_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  PASSWORD_CHANGE_NOT_REQUIRED: 409,
  USER_INACTIVE_RENAME: 422,
  CANNOT_MODIFY_SELF: 422,
  PASSWORD_UNCHANGED: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): Response {
  return Response.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: STATUS_BY_CODE[code] },
  );
}
