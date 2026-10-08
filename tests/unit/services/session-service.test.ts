import { describe, expect, it } from "vitest";
import { createUser, softDeleteUser, type User, type UserStatus } from "@/domain/user";
import { buildServices, TTL_MS } from "../fakes/build-services";

async function seedUser(
  ctx: ReturnType<typeof buildServices>,
  id: string,
  status: UserStatus = "active",
): Promise<User> {
  const user = createUser(
    {
      id,
      firstName: "Ada",
      lastName: "Lovelace",
      email: `${id}@example.com`,
      passwordHash: "hashed:secret-password",
      status,
      mustChangePassword: false,
    },
    ctx.clock.now(),
  );
  await ctx.users.insert(user);
  return user;
}

describe("SessionService.startSession", () => {
  it("creates a session with an absolute TTL and counts the login", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");

    const { session, user } = await ctx.sessionService.startSession("u1");

    expect(user.loginsCounter).toBe(1);
    expect(session).toMatchObject({ userId: "u1", terminatedAt: null });
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(TTL_MS);
    expect(ctx.sessions.all()).toHaveLength(1);
  });

  it("allows several concurrent sessions per user", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");

    const first = await ctx.sessionService.startSession("u1");
    const second = await ctx.sessionService.startSession("u1");

    expect(first.session.id).not.toBe(second.session.id);
    expect(second.user.loginsCounter).toBe(2);
  });

  it("rejects an inactive user without creating a session or counting", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1", "inactive");

    await expect(ctx.sessionService.startSession("u1")).rejects.toMatchObject({
      code: "USER_INACTIVE",
    });
    expect(ctx.sessions.all()).toHaveLength(0);
    expect(ctx.users.get("u1")?.loginsCounter).toBe(0);
  });
});

describe("SessionService.getActiveSession", () => {
  it("returns the session and user while active", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    const { session } = await ctx.sessionService.startSession("u1");

    const result = await ctx.sessionService.getActiveSession(session.id);

    expect(result?.user.id).toBe("u1");
  });

  it("returns null for an unknown id", async () => {
    expect(await buildServices().sessionService.getActiveSession("nope")).toBeNull();
  });

  it("returns null once the TTL has passed", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    const { session } = await ctx.sessionService.startSession("u1");

    ctx.clock.advance(TTL_MS - 1);
    expect(await ctx.sessionService.getActiveSession(session.id)).not.toBeNull();
    ctx.clock.advance(1);
    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();
  });

  it("returns null for a terminated session", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    const { session } = await ctx.sessionService.startSession("u1");

    await ctx.sessionService.terminate(session.id, "u1");

    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();
  });

  it("returns null when the user was deactivated or deleted meanwhile", async () => {
    const ctx = buildServices();
    const user = await seedUser(ctx, "u1");
    const { session } = await ctx.sessionService.startSession("u1");

    await ctx.users.save({ ...user, status: "inactive" });
    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();

    await ctx.users.save(softDeleteUser(user, ctx.clock.now()));
    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();
  });
});

describe("SessionService.terminate", () => {
  it("is idempotent for the owner", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    const { session } = await ctx.sessionService.startSession("u1");

    await ctx.sessionService.terminate(session.id, "u1");
    await expect(ctx.sessionService.terminate(session.id, "u1")).resolves.toBeUndefined();
  });

  it("does not let a user terminate someone else's session", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    await seedUser(ctx, "u2");
    const { session } = await ctx.sessionService.startSession("u1");

    await expect(ctx.sessionService.terminate(session.id, "u2")).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
    expect(await ctx.sessionService.getActiveSession(session.id)).not.toBeNull();
  });

  it("reports an unknown session as not found", async () => {
    await expect(buildServices().sessionService.terminate("nope", "u1")).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });
});

describe("SessionService.terminateAllForUser", () => {
  it("terminates every session of that user only", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    await seedUser(ctx, "u2");
    const a = await ctx.sessionService.startSession("u1");
    const b = await ctx.sessionService.startSession("u1");
    const other = await ctx.sessionService.startSession("u2");

    await ctx.sessionService.terminateAllForUser("u1");

    expect(await ctx.sessionService.getActiveSession(a.session.id)).toBeNull();
    expect(await ctx.sessionService.getActiveSession(b.session.id)).toBeNull();
    expect(await ctx.sessionService.getActiveSession(other.session.id)).not.toBeNull();
  });
});

describe("SessionService.listActive", () => {
  it("lists the user's own active sessions, newest first, with their user agent", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    await seedUser(ctx, "u2");
    const older = await ctx.sessionService.startSession("u1", "Firefox");
    ctx.clock.advance(1000);
    const newer = await ctx.sessionService.startSession("u1", "Chrome");
    const ended = await ctx.sessionService.startSession("u1");
    await ctx.sessionService.terminate(ended.session.id, "u1");
    await ctx.sessionService.startSession("u2");

    const sessions = await ctx.sessionService.listActive("u1");

    expect(sessions.map((s) => [s.id, s.userAgent])).toEqual([
      [newer.session.id, "Chrome"],
      [older.session.id, "Firefox"],
    ]);
  });

  it("leaves out expired sessions", async () => {
    const ctx = buildServices();
    await seedUser(ctx, "u1");
    await ctx.sessionService.startSession("u1");

    ctx.clock.advance(TTL_MS);

    expect(await ctx.sessionService.listActive("u1")).toEqual([]);
  });
});
