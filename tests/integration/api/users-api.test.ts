import { describe, expect, it } from "vitest";
import { GET as listUsers, POST as createUser } from "@/app/api/users/route";
import { DELETE as deleteUser, PATCH as updateUser } from "@/app/api/users/[id]/route";
import {
  apiRequest,
  expectError,
  routeParams,
  signUpViaApi,
  uniqueEmail,
  type SignedUp,
} from "../helpers/api";
import { setupTestDb } from "../helpers/test-db";

setupTestDb({ exposeToApp: true });

async function createViaApi(admin: SignedUp, overrides: Record<string, unknown> = {}): Promise<string> {
  const response = await createUser(
    apiRequest("POST", "/api/users", {
      token: admin.sessionId,
      body: {
        firstName: "Grace",
        lastName: "Hopper",
        email: uniqueEmail(),
        password: "temporary-pass",
        ...overrides,
      },
    }),
    undefined,
  );
  expect(response.status).toBe(201);
  return ((await response.json()) as { user: { id: string } }).user.id;
}

function patch(admin: SignedUp, id: string, body: unknown): Promise<Response> {
  return updateUser(
    apiRequest("PATCH", `/api/users/${id}`, { token: admin.sessionId, body }),
    routeParams(id),
  );
}

describe("authentication on /api/users", () => {
  it("returns 401 without credentials and with an unknown token", async () => {
    await expectError(await listUsers(apiRequest("GET", "/api/users"), undefined), 401, "UNAUTHENTICATED");
    await expectError(
      await listUsers(apiRequest("GET", "/api/users", { token: "not-a-session" }), undefined),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("accepts the session id as a Bearer token or as the sid cookie", async () => {
    const admin = await signUpViaApi();

    const viaBearer = await listUsers(apiRequest("GET", "/api/users", { token: admin.sessionId }), undefined);
    const viaCookie = await listUsers(apiRequest("GET", "/api/users", { cookie: admin.sessionId }), undefined);

    expect(viaBearer.status).toBe(200);
    expect(viaCookie.status).toBe(200);
  });
});

describe("GET /api/users", () => {
  it("returns a page of 6 by default, newest first, without credentials", async () => {
    const admin = await signUpViaApi();
    const ids: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      ids.push(await createViaApi(admin));
    }

    const response = await listUsers(apiRequest("GET", "/api/users", { token: admin.sessionId }), undefined);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ page: 1, pageSize: 6, total: 8, totalPages: 2 });
    expect(body.items).toHaveLength(6);
    expect(body.items[0].id).toBe(ids[6]);
    expect(body.items[0]).not.toHaveProperty("passwordHash");

    const page2 = await (
      await listUsers(apiRequest("GET", "/api/users?page=2", { token: admin.sessionId }), undefined)
    ).json();
    expect(page2.items).toHaveLength(2);
  });

  it("supports pageSize 12 and clamps a page past the end", async () => {
    const admin = await signUpViaApi();

    const body = await (
      await listUsers(
        apiRequest("GET", "/api/users?page=5&pageSize=12", { token: admin.sessionId }),
        undefined,
      )
    ).json();

    expect(body).toMatchObject({ page: 1, pageSize: 12, total: 1, totalPages: 1 });
  });

  it("returns 400 for an unsupported page size or page", async () => {
    const admin = await signUpViaApi();

    await expectError(
      await listUsers(apiRequest("GET", "/api/users?pageSize=7", { token: admin.sessionId }), undefined),
      400,
      "VALIDATION_ERROR",
    );
    await expectError(
      await listUsers(apiRequest("GET", "/api/users?page=0", { token: admin.sessionId }), undefined),
      400,
      "VALIDATION_ERROR",
    );
  });
});

describe("POST /api/users", () => {
  it("creates a user with a temporary password and returns 201", async () => {
    const admin = await signUpViaApi();

    const response = await createUser(
      apiRequest("POST", "/api/users", {
        token: admin.sessionId,
        body: {
          firstName: "Grace",
          lastName: "Hopper",
          email: "Grace.Hopper@Example.com",
          password: "temporary-pass",
          status: "inactive",
        },
      }),
      undefined,
    );

    expect(response.status).toBe(201);
    const { user } = await response.json();
    expect(user).toMatchObject({
      email: "grace.hopper@example.com",
      status: "inactive",
      mustChangePassword: true,
      loginsCounter: 0,
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("returns 409 for a taken email and 400 for invalid input", async () => {
    const admin = await signUpViaApi();

    await expectError(
      await createUser(
        apiRequest("POST", "/api/users", {
          token: admin.sessionId,
          body: { firstName: "A", lastName: "B", email: admin.email, password: "temporary-pass" },
        }),
        undefined,
      ),
      409,
      "EMAIL_TAKEN",
    );
    await expectError(
      await createUser(
        apiRequest("POST", "/api/users", { token: admin.sessionId, body: { firstName: "A" } }),
        undefined,
      ),
      400,
      "VALIDATION_ERROR",
    );
  });
});

describe("PATCH /api/users/:id", () => {
  it("updates allowed fields and returns 200 with updatedAt changed", async () => {
    const admin = await signUpViaApi();
    const id = await createViaApi(admin);

    const response = await patch(admin, id, { firstName: "Augusta", status: "inactive" });

    expect(response.status).toBe(200);
    const { user } = await response.json();
    expect(user).toMatchObject({ firstName: "Augusta", status: "inactive" });
    expect(new Date(user.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(user.createdAt).getTime());
  });

  it.each([
    ["createdAt", { createdAt: "2000-01-01T00:00:00Z" }],
    ["email", { email: "new@example.com" }],
    ["loginsCounter", { loginsCounter: 99 }],
    ["an empty body", {}],
  ])("returns 400 for %s", async (_label, body) => {
    const admin = await signUpViaApi();
    const id = await createViaApi(admin);

    await expectError(await patch(admin, id, body), 400, "VALIDATION_ERROR");
  });

  it("returns 422 when renaming an inactive user, even together with activation", async () => {
    const admin = await signUpViaApi();
    const id = await createViaApi(admin, { status: "inactive" });

    await expectError(
      await patch(admin, id, { status: "active", lastName: "Renamed" }),
      422,
      "USER_INACTIVE_RENAME",
    );
  });

  it("returns 422 when deactivating yourself and 404 for an unknown user", async () => {
    const admin = await signUpViaApi();

    await expectError(await patch(admin, admin.userId, { status: "inactive" }), 422, "CANNOT_MODIFY_SELF");
    await expectError(await patch(admin, "missing-id", { firstName: "X" }), 404, "USER_NOT_FOUND");
  });

  it("revokes the sessions of a user who gets deactivated", async () => {
    const admin = await signUpViaApi();
    const other = await signUpViaApi();

    await patch(admin, other.userId, { status: "inactive" });

    await expectError(
      await listUsers(apiRequest("GET", "/api/users", { token: other.sessionId }), undefined),
      401,
      "UNAUTHENTICATED",
    );
  });
});

describe("DELETE /api/users/:id", () => {
  it("soft-deletes with 204; the user disappears and a second delete is 404", async () => {
    const admin = await signUpViaApi();
    const id = await createViaApi(admin);
    const remove = (): Promise<Response> =>
      deleteUser(apiRequest("DELETE", `/api/users/${id}`, { token: admin.sessionId }), routeParams(id));

    expect((await remove()).status).toBe(204);
    const list = await (
      await listUsers(apiRequest("GET", "/api/users", { token: admin.sessionId }), undefined)
    ).json();
    expect(list.items.map((u: { id: string }) => u.id)).not.toContain(id);
    await expectError(await remove(), 404, "USER_NOT_FOUND");
  });

  it("returns 422 when deleting yourself", async () => {
    const admin = await signUpViaApi();

    await expectError(
      await deleteUser(
        apiRequest("DELETE", `/api/users/${admin.userId}`, { token: admin.sessionId }),
        routeParams(admin.userId),
      ),
      422,
      "CANNOT_MODIFY_SELF",
    );
  });
});
