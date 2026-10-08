import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createUser } from "@/domain/user";
import { MongoSessionRepository } from "@/server/repositories/mongo/mongo-session-repository";
import { MongoUserRepository } from "@/server/repositories/mongo/mongo-user-repository";
import { Argon2PasswordHasher } from "@/server/security/password";
import { DEMO_ADMIN_EMAIL, seedDemoData, type SeedDeps } from "@/server/seed";
import { AuthService } from "@/server/services/auth-service";
import { SessionService } from "@/server/services/session-service";
import { UserService } from "@/server/services/user-service";
import { setupTestDb } from "./helpers/test-db";

const getDb = setupTestDb();
const PASSWORD = "demo-password";

function deps(): SeedDeps {
  return {
    users: new MongoUserRepository(getDb()),
    hasher: new Argon2PasswordHasher(),
    clock: () => new Date(),
    generateId: randomUUID,
  };
}

function services(): { authService: AuthService; userService: UserService } {
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
  const common = { users, sessionService, hasher, clock, generateId: randomUUID };
  return { authService: new AuthService(common), userService: new UserService(common) };
}

describe("seedDemoData", () => {
  it("creates the admin and 20 users, newest first, two of them inactive", async () => {
    expect(await seedDemoData(deps(), PASSWORD)).toBe(true);

    const page = await services().userService.list({ page: 1, pageSize: 24 });
    expect(page.total).toBe(21);
    expect(page.items[0]).toMatchObject({ email: DEMO_ADMIN_EMAIL, mustChangePassword: false });
    expect(page.items.filter((user) => user.status === "inactive")).toHaveLength(2);
    expect(page.items.slice(1).every((user) => user.mustChangePassword)).toBe(true);
    expect(page.items.map((user) => user.email)).toContain("guido.vanrossum@example.com");
  });

  it("does nothing the second time", async () => {
    await seedDemoData(deps(), PASSWORD);

    expect(await seedDemoData(deps(), PASSWORD)).toBe(false);
    expect((await services().userService.list({ page: 1, pageSize: 6 })).total).toBe(21);
  });

  it("never seeds a database that already has users", async () => {
    await deps().users.insert(
      createUser(
        {
          id: randomUUID(),
          firstName: "Real",
          lastName: "User",
          email: "real@example.com",
          passwordHash: "hash",
          status: "active",
          mustChangePassword: false,
        },
        new Date(),
      ),
    );

    expect(await seedDemoData(deps(), PASSWORD)).toBe(false);
    expect((await services().userService.list({ page: 1, pageSize: 6 })).total).toBe(1);
  });

  it("lets the demo admin sign in; demo users must change their password", async () => {
    await seedDemoData(deps(), PASSWORD);
    const { authService } = services();

    const admin = await authService.signIn({ email: DEMO_ADMIN_EMAIL, password: PASSWORD });
    const user = await authService.signIn({ email: "ada.lovelace@example.com", password: PASSWORD });

    expect(admin.user.mustChangePassword).toBe(false);
    expect(user.user.mustChangePassword).toBe(true);
  });
});
