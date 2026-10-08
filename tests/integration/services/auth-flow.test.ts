import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MongoSessionRepository } from "@/server/repositories/mongo/mongo-session-repository";
import { MongoUserRepository } from "@/server/repositories/mongo/mongo-user-repository";
import { Argon2PasswordHasher } from "@/server/security/password";
import { AuthService } from "@/server/services/auth-service";
import { SessionService } from "@/server/services/session-service";
import { setupTestDb } from "../helpers/test-db";

const getDb = setupTestDb();

function buildRealServices(): { authService: AuthService; sessionService: SessionService } {
  const users = new MongoUserRepository(getDb());
  const clock = (): Date => new Date();
  const sessionService = new SessionService({
    users,
    sessions: new MongoSessionRepository(getDb()),
    clock,
    generateId: randomUUID,
    ttlMs: 60 * 60 * 1000,
  });
  const authService = new AuthService({
    users,
    sessionService,
    hasher: new Argon2PasswordHasher(),
    clock,
    generateId: randomUUID,
  });
  return { authService, sessionService };
}

describe("auth flow against MongoDB and Argon2", () => {
  it("signs up, signs in, verifies and terminates a session", async () => {
    const { authService, sessionService } = buildRealServices();

    const signedUp = await authService.signUp({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
    });
    expect(signedUp.user.passwordHash).toMatch(/^\$argon2id\$/);

    const signedIn = await authService.signIn({
      email: "ada@example.com",
      password: "correct-horse",
    });
    expect(signedIn.user.loginsCounter).toBe(2);

    const active = await sessionService.getActiveSession(signedIn.session.id);
    expect(active?.user.email).toBe("ada@example.com");

    await sessionService.terminate(signedIn.session.id, signedIn.user.id);
    expect(await sessionService.getActiveSession(signedIn.session.id)).toBeNull();
    // The sign-up session is independent and still active.
    expect(await sessionService.getActiveSession(signedUp.session.id)).not.toBeNull();
  });

  it("rejects a wrong password with the real hasher", async () => {
    const { authService } = buildRealServices();
    await authService.signUp({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
    });

    await expect(
      authService.signIn({ email: "ada@example.com", password: "wrong-horse" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});
