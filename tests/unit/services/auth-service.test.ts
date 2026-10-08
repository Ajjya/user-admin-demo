import { describe, expect, it } from "vitest";
import { applyUserUpdate, createUser, softDeleteUser, type User } from "@/domain/user";
import { buildServices } from "../fakes/build-services";

const signUpInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
};

async function seedTemporaryPasswordUser(ctx: ReturnType<typeof buildServices>): Promise<User> {
  const user = createUser(
    {
      id: "temp-user",
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      passwordHash: "hashed:temporary-pass",
      status: "active",
      mustChangePassword: true,
    },
    ctx.clock.now(),
  );
  await ctx.users.insert(user);
  return user;
}

describe("AuthService.signUp", () => {
  it("creates an active user, hashes the password and starts a session", async () => {
    const ctx = buildServices();

    const { session, user } = await ctx.authService.signUp(signUpInput);

    expect(user).toMatchObject({
      email: "ada@example.com",
      status: "active",
      mustChangePassword: false,
      loginsCounter: 1,
      passwordHash: "hashed:correct-horse",
    });
    expect(session.userId).toBe(user.id);
  });

  it("rejects a duplicate email without creating a session", async () => {
    const ctx = buildServices();
    await ctx.authService.signUp(signUpInput);

    await expect(ctx.authService.signUp(signUpInput)).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });
    expect(ctx.sessions.all()).toHaveLength(1);
  });
});

describe("AuthService.signIn", () => {
  it("signs in with the right password, matching the email case-insensitively", async () => {
    const ctx = buildServices();
    await ctx.authService.signUp(signUpInput);

    const { user } = await ctx.authService.signIn({
      email: " ADA@example.com ",
      password: "correct-horse",
    });

    expect(user.loginsCounter).toBe(2);
  });

  it("returns the same error for a wrong password, an unknown email and a deleted user", async () => {
    const ctx = buildServices();
    const { user } = await ctx.authService.signUp(signUpInput);
    await ctx.authService.signUp({ ...signUpInput, email: "deleted@example.com" });
    const deleted = await ctx.users.findByEmail("deleted@example.com");
    await ctx.users.save(softDeleteUser(deleted!, ctx.clock.now()));

    const attempts = [
      { email: "ada@example.com", password: "wrong-password" },
      { email: "nobody@example.com", password: "correct-horse" },
      { email: "deleted@example.com", password: "correct-horse" },
    ];
    for (const attempt of attempts) {
      await expect(ctx.authService.signIn(attempt)).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }
    expect(ctx.users.get(user.id)?.loginsCounter).toBe(1);
  });

  it("still runs a password check for an unknown email (no timing leak)", async () => {
    const ctx = buildServices();

    await expect(
      ctx.authService.signIn({ email: "nobody@example.com", password: "whatever-pass" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(ctx.hasher.verifyCalls).toBe(1);
  });

  it("reveals an inactive account only after the password is correct", async () => {
    const ctx = buildServices();
    const { user } = await ctx.authService.signUp(signUpInput);
    await ctx.users.save(applyUserUpdate(user, { status: "inactive" }, ctx.clock.now()));

    await expect(
      ctx.authService.signIn({ email: "ada@example.com", password: "wrong-password" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      ctx.authService.signIn({ email: "ada@example.com", password: "correct-horse" }),
    ).rejects.toMatchObject({ code: "USER_INACTIVE" });
    expect(ctx.sessions.all()).toHaveLength(1);
  });

  it("signs in a user with a temporary password and reports the flag", async () => {
    const ctx = buildServices();
    await seedTemporaryPasswordUser(ctx);

    const { user } = await ctx.authService.signIn({
      email: "grace@example.com",
      password: "temporary-pass",
    });

    expect(user.mustChangePassword).toBe(true);
  });
});

describe("AuthService.changeOwnPassword", () => {
  it("replaces a temporary password and clears the flag", async () => {
    const ctx = buildServices();
    const user = await seedTemporaryPasswordUser(ctx);
    ctx.clock.advance(1000);

    const updated = await ctx.authService.changeOwnPassword(user.id, "brand-new-pass");

    expect(updated).toMatchObject({
      passwordHash: "hashed:brand-new-pass",
      mustChangePassword: false,
      updatedAt: ctx.clock.now(),
    });
    expect(ctx.users.get(user.id)?.mustChangePassword).toBe(false);
  });

  it("rejects reusing the temporary password", async () => {
    const ctx = buildServices();
    const user = await seedTemporaryPasswordUser(ctx);

    await expect(
      ctx.authService.changeOwnPassword(user.id, "temporary-pass"),
    ).rejects.toMatchObject({ code: "PASSWORD_UNCHANGED" });
  });

  it("rejects the change when it is not required", async () => {
    const ctx = buildServices();
    const { user } = await ctx.authService.signUp(signUpInput);

    await expect(
      ctx.authService.changeOwnPassword(user.id, "brand-new-pass"),
    ).rejects.toMatchObject({ code: "PASSWORD_CHANGE_NOT_REQUIRED" });
  });

  it("rejects an unknown user", async () => {
    await expect(
      buildServices().authService.changeOwnPassword("nope", "brand-new-pass"),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
