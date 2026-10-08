import { randomUUID } from "node:crypto";
import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

/** Unique per test, so tests never depend on each other or on order. */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${randomUUID()}@example.test`;
}

export interface TestAccount {
  email: string;
  password: string;
  firstName: string;
  sessionId: string;
  userId: string;
}

export interface NewUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  status?: "active" | "inactive";
}

/**
 * Fast setup through the REST API (Bearer token), so UI tests only click through the behaviour
 * they are actually testing.
 */
export class ApiHelper {
  constructor(private readonly request: APIRequestContext) {}

  async signUp(firstName = "Ada"): Promise<TestAccount> {
    const account = { email: uniqueEmail(), password: "correct-horse", firstName };
    const response = await this.request.post("/api/auth/sign-up", {
      data: { ...account, lastName: "Tester" },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    return { ...account, sessionId: body.sessionId, userId: body.user.id };
  }

  async createUser(token: string, user: NewUser = {}): Promise<{ id: string; email: string }> {
    const data = {
      firstName: "Grace",
      lastName: "Hopper",
      email: uniqueEmail("user"),
      password: "temporary-pass",
      ...user,
    };
    const response = await this.request.post("/api/users", {
      headers: { authorization: `Bearer ${token}` },
      data,
    });
    expect(response.status()).toBe(201);
    return { id: (await response.json()).user.id, email: data.email };
  }

  async terminateSession(sessionId: string): Promise<void> {
    const response = await this.request.delete(`/api/sessions/${sessionId}`, {
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(response.status()).toBe(204);
  }
}

/** Signs in through the real UI form. */
export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export const test = base.extend<{ api: ApiHelper }>({
  api: async ({ request }, use) => {
    await use(new ApiHelper(request));
  },
});

export { expect };
