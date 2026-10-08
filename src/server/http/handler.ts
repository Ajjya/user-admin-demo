import "server-only";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/domain/errors";
import { errorResponse } from "@/server/http/errors";
import { logger } from "@/server/logger";

type RouteHandler<Context> = (request: NextRequest, context: Context) => Promise<Response>;

function toErrorResponse(error: unknown, requestId: string): Response {
  if (error instanceof DomainError) {
    return errorResponse(error.code, error.message);
  }
  if (error instanceof ZodError) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Request validation failed",
      error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  // Unexpected: log the details, return nothing internal to the client.
  logger.error({ err: error, requestId }, "Unhandled error in API route");
  return errorResponse("INTERNAL_ERROR", "Unexpected error");
}

/**
 * Wraps every Route Handler: maps errors to the JSON error format and logs one line per request
 * (method, path, status, duration; never bodies, cookies or tokens). Like a NestJS exception
 * filter plus a logging interceptor, as a plain higher-order function.
 */
export function withApi<Context>(handler: RouteHandler<Context>): RouteHandler<Context> {
  return async (request, context) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    let response: Response;
    try {
      response = await handler(request, context);
    } catch (error) {
      response = toErrorResponse(error, requestId);
    }
    response.headers.set("x-request-id", requestId);
    logger.info({
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return response;
  };
}
