import { NextRequest } from "next/server";
import { expect } from "vitest";
import { POST as signUp } from "@/app/api/auth/sign-up/route";

const BASE_URL = "http://localhost:3000";

export interface RequestOptions {
  body?: unknown;
  rawBody?: string;
  token?: string;
  cookie?: string;
  userAgent?: string;
}

/** Builds the NextRequest that Next.js would pass to a Route Handler. */
export function apiRequest(method: string, path: string, options: RequestOptions = {}): NextRequest {
  const headers = new Headers();
  if (options.body !== undefined || options.rawBody !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }
  if (options.cookie) {
    headers.set("cookie", `sid=${options.cookie}`);
  }
  if (options.userAgent) {
    headers.set("user-agent", options.userAgent);
  }
  return new NextRequest(new URL(path, BASE_URL), {
    method,
    headers,
    body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
}

/** The second argument Next.js passes to dynamic routes such as /api/users/[id]. */
export function routeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

let sequence = 0;

export function uniqueEmail(prefix = "user"): string {
  sequence += 1;
  return `${prefix}${sequence}-${Date.now()}@example.com`;
}

export interface SignedUp {
  sessionId: string;
  userId: string;
  email: string;
}

export async function signUpViaApi(password = "admin-password"): Promise<SignedUp> {
  const email = uniqueEmail("admin");
  const response = await signUp(
    apiRequest("POST", "/api/auth/sign-up", {
      body: { firstName: "Admin", lastName: "User", email, password },
    }),
    undefined,
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { sessionId: string; user: { id: string } };
  return { sessionId: body.sessionId, userId: body.user.id, email };
}

export async function expectError(
  response: Response,
  status: number,
  code: string,
): Promise<{ error: { code: string; message: string; details?: unknown[] } }> {
  expect(response.status).toBe(status);
  const body = (await response.json()) as {
    error: { code: string; message: string; details?: unknown[] };
  };
  expect(body.error.code).toBe(code);
  expect(typeof body.error.message).toBe("string");
  return body;
}
