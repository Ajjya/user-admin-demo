import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MongoSessionRepository } from "@/server/repositories/mongo/mongo-session-repository";
import { MongoUserRepository } from "@/server/repositories/mongo/mongo-user-repository";
import { Argon2PasswordHasher } from "@/server/security/password";
import { AuthService } from "@/server/services/auth-service";
import { SessionService } from "@/server/services/session-service";
import { UserService } from "@/server/services/user-service";
import { setupTestDb } from "../helpers/test-db";

const getDb = setupTestDb();

function buildRealServices(): {
  authService: AuthService;
  sessionService: SessionService;
  userService: UserService;
} {
  const users = new MongoUserRepository(getDb());
  const hasher = new Argon2PasswordHasher();
  const clock = (): Date => new Date();
  const sessionService = new SessionService({
    users,
    sessions: new MongoSessionRepository(getDb()),
    clock,
    generateId: randomUUID,
    ttlMs: 60 * 60 * 1000,
  });
  const deps = { users, sessionService, hasher, clock, generateId: randomUUID };
  return {
    sessionService,
    authService: new AuthService(deps),
    userService: new UserService(deps),
  };
}

describe("user management against MongoDB", () => {
  it("creates, lists, updates and deletes a user end to end", async () => {
    const { authService, sessionService, userService } = buildRealServices();
    const { user: admin } = await authService.signUp({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "admin-password",
    });

    const created = await userService.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "Grace@Example.com",
      password: "temporary-pass",
      status: "active",
    });
    expect(created).toMatchObject({ email: "grace@example.com", mustChangePassword: true });

    const page = await userService.list({ page: 1, pageSize: 6 });
    expect(page.items.map((u) => u.id)).toEqual([created.id, admin.id]);

    const { session } = await authService.signIn({
      email: "grace@example.com",
      password: "temporary-pass",
    });
    await userService.update(admin.id, created.id, { status: "inactive" });
    expect(await sessionService.getActiveSession(session.id)).toBeNull();

    await userService.remove(admin.id, created.id);
    expect((await userService.list({ page: 1, pageSize: 6 })).total).toBe(1);
    await expect(
      authService.signIn({ email: "grace@example.com", password: "temporary-pass" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});
