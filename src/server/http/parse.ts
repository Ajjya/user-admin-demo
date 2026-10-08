import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { DomainError } from "@/domain/errors";

/** Parses the JSON body with a zod schema; a ZodError is turned into a 400 by withApi. */
export async function parseJsonBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Request body must be valid JSON");
  }
  return schema.parse(body);
}

export function parseQuery<T extends z.ZodType>(request: NextRequest, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(request.nextUrl.searchParams));
}
