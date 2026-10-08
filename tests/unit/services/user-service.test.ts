import { describe, expect, it } from "vitest";
import { buildServices } from "../fakes/build-services";

type Ctx = ReturnType<typeof buildServices>;

const ADMIN_PASSWORD = "admin-password";

/** Signs up the acting admin, like a real session would. */
async function signUpAdmin(ctx: Ctx): Promise<string> {
  const { user } = await ctx.authService.signUp({
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: ADMIN_PASSWORD,
  });
  return user.id;
}

async function createUsers(ctx: Ctx, count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    ctx.clock.advance(1000);
    const user = await ctx.userService.create({
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
      password: "temporary-pass",
      status: "active",
    });
    ids.push(user.id);
  }
  return ids;
}

describe("UserService.list", () => {
  it("returns a page of public users, newest first, with totals", async () => {
    const ctx = buildServices();
    const ids = await createUsers(ctx, 8);

    const page = await ctx.userService.list({ page: 1, pageSize: 6 });

    expect(page).toMatchObject({ page: 1, pageSize: 6, total: 8, totalPages: 2 });
    expect(page.items.map((u) => u.id)).toEqual([...ids].reverse().slice(0, 6));
    expect(page.items[0]).not.toHaveProperty("passwordHash");
  });

  it("returns the remainder on the last page", async () => {
    const ctx = buildServices();
    const ids = await createUsers(ctx, 8);

    const page = await ctx.userService.list({ page: 2, pageSize: 6 });

    expect(page.items.map((u) => u.id)).toEqual([ids[1], ids[0]]);
  });

  it("clamps a page past the end to the last page", async () => {
    const ctx = buildServices();
    await createUsers(ctx, 8);

    const page = await ctx.userService.list({ page: 99, pageSize: 6 });

    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it("reports one empty page when there are no users", async () => {
    const page = await buildServices().userService.list({ page: 3, pageSize: 6 });

    expect(page).toEqual({ items: [], page: 1, pageSize: 6, total: 0, totalPages: 1 });
  });
});

describe("UserService.create", () => {
  it("creates a user with a temporary password and the requested status", async () => {
    const ctx = buildServices();

    const user = await ctx.userService.create({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      password: "temporary-pass",
      status: "inactive",
    });

    expect(user).toMatchObject({ status: "inactive", mustChangePassword: true, loginsCounter: 0 });
    expect(ctx.users.get(user.id)?.passwordHash).toBe("hashed:temporary-pass");
  });

  it("keeps a deleted user's email reserved", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    await ctx.userService.remove(adminId, id);

    await expect(
      ctx.userService.create({
        firstName: "New",
        lastName: "Person",
        email: "user1@example.com",
        password: "temporary-pass",
        status: "active",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });
});

describe("UserService.update", () => {
  it("renames an active user and sets updatedAt", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    ctx.clock.advance(5000);

    const updated = await ctx.userService.update(adminId, id, { firstName: "Renamed" });

    expect(updated.firstName).toBe("Renamed");
    expect(updated.updatedAt).toEqual(ctx.clock.now());
    expect(updated.createdAt).not.toEqual(updated.updatedAt);
  });

  it("rejects renaming an inactive user (422 rule from the domain)", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    await ctx.userService.update(adminId, id, { status: "inactive" });

    await expect(
      ctx.userService.update(adminId, id, { status: "active", lastName: "Renamed" }),
    ).rejects.toMatchObject({ code: "USER_INACTIVE_RENAME" });
  });

  it("forbids deactivating yourself", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);

    await expect(
      ctx.userService.update(adminId, adminId, { status: "inactive" }),
    ).rejects.toMatchObject({ code: "CANNOT_MODIFY_SELF" });
  });

  it("allows renaming yourself", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);

    expect((await ctx.userService.update(adminId, adminId, { firstName: "Me" })).firstName).toBe(
      "Me",
    );
  });

  it("terminates the sessions of a user who gets deactivated", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    const { session } = await ctx.sessionService.startSession(id);

    await ctx.userService.update(adminId, id, { status: "inactive" });

    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();
    expect(ctx.sessions.all().find((s) => s.id === session.id)?.terminatedAt).not.toBeNull();
  });

  it("makes a password set by another admin temporary and terminates that user's sessions", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    await ctx.authService.changeOwnPassword(id, "users-own-pass");
    const { session } = await ctx.sessionService.startSession(id);

    const updated = await ctx.userService.update(adminId, id, { password: "reset-by-admin" });

    expect(updated.mustChangePassword).toBe(true);
    expect(ctx.users.get(id)?.passwordHash).toBe("hashed:reset-by-admin");
    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();
  });

  it("keeps your own new password permanent and your session alive", async () => {
    const ctx = buildServices();
    const { user, session } = await ctx.authService.signUp({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: ADMIN_PASSWORD,
    });

    const updated = await ctx.userService.update(user.id, user.id, { password: "my-new-password" });

    expect(updated.mustChangePassword).toBe(false);
    expect(await ctx.sessionService.getActiveSession(session.id)).not.toBeNull();
  });

  it("does not terminate sessions for a plain rename", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    const { session } = await ctx.sessionService.startSession(id);

    await ctx.userService.update(adminId, id, { firstName: "Renamed" });

    expect(await ctx.sessionService.getActiveSession(session.id)).not.toBeNull();
  });

  it("reports an unknown user as not found", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);

    await expect(
      ctx.userService.update(adminId, "missing", { firstName: "X" }),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});

describe("UserService.remove", () => {
  it("soft-deletes the user and terminates their sessions", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    const { session } = await ctx.sessionService.startSession(id);

    await ctx.userService.remove(adminId, id);

    expect(ctx.users.get(id)?.deletedAt).toEqual(ctx.clock.now());
    expect(await ctx.sessionService.getActiveSession(session.id)).toBeNull();
    expect((await ctx.userService.list({ page: 1, pageSize: 6 })).total).toBe(1);
  });

  it("forbids deleting yourself", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);

    await expect(ctx.userService.remove(adminId, adminId)).rejects.toMatchObject({
      code: "CANNOT_MODIFY_SELF",
    });
  });

  it("reports an unknown or already deleted user as not found", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    await ctx.userService.remove(adminId, id);

    await expect(ctx.userService.remove(adminId, id)).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
    await expect(ctx.userService.remove(adminId, "missing")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("makes the deleted user unable to sign in", async () => {
    const ctx = buildServices();
    const adminId = await signUpAdmin(ctx);
    const [id] = await createUsers(ctx, 1);
    await ctx.userService.remove(adminId, id);

    await expect(
      ctx.authService.signIn({ email: "user1@example.com", password: "temporary-pass" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});
