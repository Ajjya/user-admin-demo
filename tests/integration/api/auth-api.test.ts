import { describe, expect, it } from "vitest";
import { POST as changePassword } from "@/app/api/auth/change-password/route";
import { POST as signUp } from "@/app/api/auth/sign-up/route";
import { DELETE as terminateSession } from "@/app/api/sessions/[id]/route";
import { POST as signIn } from "@/app/api/sessions/route";
import { GET as listUsers, POST as createUser } from "@/app/api/users/route";
import { PATCH as updateUser } from "@/app/api/users/[id]/route";
import {
  apiRequest,
  expectError,
  routeParams,
  signUpViaApi,
  uniqueEmail,
} from "../helpers/api";
import { setupTestDb } from "../helpers/test-db";

setupTestDb({ exposeToApp: true });

const validSignUp = (email: string): Record<string, string> => ({
  firstName: "Ada",
  lastName: "Lovelace",
  email,
  password: "correct-horse",
});

describe("POST /api/auth/sign-up", () => {
  it("creates the user and a session, returned in the body and an httpOnly cookie", async () => {
    const email = uniqueEmail();

    const response = await signUp(
      apiRequest("POST", "/api/auth/sign-up", { body: validSignUp(email) }),
      undefined,
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      sessionId: expect.any(String),
      expiresAt: expect.any(String),
      user: { email, status: "active", loginsCounter: 1, mustChangePassword: false },
    });
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(body.user).not.toHaveProperty("deletedAt");

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`sid=${body.sessionId}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 400 with field details for invalid input", async () => {
    const response = await signUp(
      apiRequest("POST", "/api/auth/sign-up", {
        body: { ...validSignUp("not-an-email"), password: "short" },
      }),
      undefined,
    );

    const body = await expectError(response, 400, "VALIDATION_ERROR");
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "email" }),
        expect.objectContaining({ path: "password" }),
      ]),
    );
  });

  it("returns 400 for unknown fields and for malformed JSON", async () => {
    await expectError(
      await signUp(
        apiRequest("POST", "/api/auth/sign-up", {
          body: { ...validSignUp(uniqueEmail()), status: "inactive" },
        }),
        undefined,
      ),
      400,
      "VALIDATION_ERROR",
    );
    await expectError(
      await signUp(apiRequest("POST", "/api/auth/sign-up", { rawBody: "{not json" }), undefined),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("returns 409 for an email that is already registered, in any case", async () => {
    const email = uniqueEmail();
    await signUp(apiRequest("POST", "/api/auth/sign-up", { body: validSignUp(email) }), undefined);

    const response = await signUp(
      apiRequest("POST", "/api/auth/sign-up", { body: validSignUp(email.toUpperCase()) }),
      undefined,
    );

    await expectError(response, 409, "EMAIL_TAKEN");
  });
});

describe("POST /api/sessions (sign in)", () => {
  it("returns 201 with a new session and cookie", async () => {
    const { email } = await signUpViaApi("correct-horse");

    const response = await signIn(
      apiRequest("POST", "/api/sessions", { body: { email, password: "correct-horse" } }),
      undefined,
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user.loginsCounter).toBe(2);
    expect(response.headers.get("set-cookie")).toContain(`sid=${body.sessionId}`);
  });

  it("returns the same 401 for a wrong password and an unknown email", async () => {
    const { email } = await signUpViaApi("correct-horse");

    const wrong = await expectError(
      await signIn(
        apiRequest("POST", "/api/sessions", { body: { email, password: "wrong-horse" } }),
        undefined,
      ),
      401,
      "INVALID_CREDENTIALS",
    );
    const unknown = await expectError(
      await signIn(
        apiRequest("POST", "/api/sessions", {
          body: { email: uniqueEmail(), password: "correct-horse" },
        }),
        undefined,
      ),
      401,
      "INVALID_CREDENTIALS",
    );
    expect(wrong.error.message).toBe(unknown.error.message);
  });

  it("returns 403 for an inactive user with the right password", async () => {
    const admin = await signUpViaApi();
    const email = uniqueEmail();
    await createUser(
      apiRequest("POST", "/api/users", {
        token: admin.sessionId,
        body: { ...validSignUp(email), password: "temporary-pass", status: "inactive" },
      }),
      undefined,
    );

    const response = await signIn(
      apiRequest("POST", "/api/sessions", { body: { email, password: "temporary-pass" } }),
      undefined,
    );

    await expectError(response, 403, "USER_INACTIVE");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("DELETE /api/sessions/:id (log out)", () => {
  it("terminates the caller's session, clears the cookie, and the session stops working", async () => {
    const { sessionId } = await signUpViaApi();

    const response = await terminateSession(
      apiRequest("DELETE", `/api/sessions/${sessionId}`, { cookie: sessionId }),
      routeParams(sessionId),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toMatch(/sid=;/);
    await expectError(
      await listUsers(apiRequest("GET", "/api/users", { token: sessionId }), undefined),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("returns 404 for another user's session", async () => {
    const alice = await signUpViaApi();
    const bob = await signUpViaApi();

    await expectError(
      await terminateSession(
        apiRequest("DELETE", `/api/sessions/${bob.sessionId}`, { token: alice.sessionId }),
        routeParams(bob.sessionId),
      ),
      404,
      "SESSION_NOT_FOUND",
    );
  });

  it("returns 401 without a session", async () => {
    await expectError(
      await terminateSession(apiRequest("DELETE", "/api/sessions/x"), routeParams("x")),
      401,
      "UNAUTHENTICATED",
    );
  });
});

describe("temporary password flow", () => {
  async function signInWithTemporaryPassword(): Promise<string> {
    const admin = await signUpViaApi();
    const email = uniqueEmail();
    await createUser(
      apiRequest("POST", "/api/users", {
        token: admin.sessionId,
        body: { ...validSignUp(email), password: "temporary-pass" },
      }),
      undefined,
    );
    const response = await signIn(
      apiRequest("POST", "/api/sessions", { body: { email, password: "temporary-pass" } }),
      undefined,
    );
    const body = await response.json();
    expect(body.user.mustChangePassword).toBe(true);
    return body.sessionId as string;
  }

  it("blocks other endpoints with 403 until the password is changed", async () => {
    const sessionId = await signInWithTemporaryPassword();

    await expectError(
      await listUsers(apiRequest("GET", "/api/users", { token: sessionId }), undefined),
      403,
      "PASSWORD_CHANGE_REQUIRED",
    );

    const changed = await changePassword(
      apiRequest("POST", "/api/auth/change-password", {
        token: sessionId,
        body: { newPassword: "my-own-password" },
      }),
      undefined,
    );
    expect(changed.status).toBe(200);
    expect((await changed.json()).user.mustChangePassword).toBe(false);

    const list = await listUsers(apiRequest("GET", "/api/users", { token: sessionId }), undefined);
    expect(list.status).toBe(200);
  });

  it("returns 422 when the temporary password is reused", async () => {
    const sessionId = await signInWithTemporaryPassword();

    await expectError(
      await changePassword(
        apiRequest("POST", "/api/auth/change-password", {
          token: sessionId,
          body: { newPassword: "temporary-pass" },
        }),
        undefined,
      ),
      422,
      "PASSWORD_UNCHANGED",
    );
  });

  it("returns 409 when no change is required", async () => {
    const { sessionId } = await signUpViaApi();

    await expectError(
      await changePassword(
        apiRequest("POST", "/api/auth/change-password", {
          token: sessionId,
          body: { newPassword: "another-password" },
        }),
        undefined,
      ),
      409,
      "PASSWORD_CHANGE_NOT_REQUIRED",
    );
  });

  it("forces a change again after an admin resets the password", async () => {
    const admin = await signUpViaApi();
    const other = await signUpViaApi();

    await updateUser(
      apiRequest("PATCH", `/api/users/${other.userId}`, {
        token: admin.sessionId,
        body: { password: "reset-by-admin" },
      }),
      routeParams(other.userId),
    );

    // The reset terminated the old session...
    await expectError(
      await listUsers(apiRequest("GET", "/api/users", { token: other.sessionId }), undefined),
      401,
      "UNAUTHENTICATED",
    );
    // ...and the new sign-in is flagged.
    const response = await signIn(
      apiRequest("POST", "/api/sessions", {
        body: { email: other.email, password: "reset-by-admin" },
      }),
      undefined,
    );
    expect((await response.json()).user.mustChangePassword).toBe(true);
  });
});
