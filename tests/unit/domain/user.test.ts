import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import {
  applyUserUpdate,
  assertCanStartSession,
  createUser,
  normalizeEmail,
  softDeleteUser,
  toPublicUser,
  type NewUser,
  type User,
  type UserChanges,
} from "@/domain/user";

const CREATED_AT = new Date("2026-01-01T10:00:00Z");
const LATER = new Date("2026-01-02T12:00:00Z");

function newUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    passwordHash: "hash-1",
    status: "active",
    mustChangePassword: false,
    ...overrides,
  };
}

function inactiveUser(): User {
  return createUser(newUser({ status: "inactive" }), CREATED_AT);
}

function expectDomainError(fn: () => unknown, code: DomainError["code"]): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  expect.fail(`expected DomainError ${code}`);
}

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ada.Lovelace@Example.COM ")).toBe("ada.lovelace@example.com");
  });
});

describe("createUser", () => {
  it("sets timestamps, counter and soft-delete marker", () => {
    const user = createUser(newUser({ email: " ADA@example.com" }), CREATED_AT);

    expect(user).toMatchObject({
      email: "ada@example.com",
      loginsCounter: 0,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      deletedAt: null,
    });
  });
});

describe("applyUserUpdate", () => {
  it("always sets updatedAt and never changes createdAt", () => {
    const user = createUser(newUser(), CREATED_AT);

    const updated = applyUserUpdate(user, { status: "inactive" }, LATER);

    expect(updated.updatedAt).toEqual(LATER);
    expect(updated.createdAt).toEqual(CREATED_AT);
  });

  it("sets updatedAt even when no field changes", () => {
    const user = createUser(newUser(), CREATED_AT);

    expect(applyUserUpdate(user, {}, LATER).updatedAt).toEqual(LATER);
  });

  it("ignores createdAt and email smuggled into the changes at runtime", () => {
    const user = createUser(newUser(), CREATED_AT);
    const smuggled = {
      firstName: "Augusta",
      createdAt: LATER,
      email: "other@example.com",
    } as UserChanges;

    const updated = applyUserUpdate(user, smuggled, LATER);

    expect(updated.firstName).toBe("Augusta");
    expect(updated.createdAt).toEqual(CREATED_AT);
    expect(updated.email).toBe("ada@example.com");
  });

  it("renames an active user", () => {
    const user = createUser(newUser(), CREATED_AT);

    const updated = applyUserUpdate(user, { firstName: "Augusta", lastName: "King" }, LATER);

    expect(updated).toMatchObject({ firstName: "Augusta", lastName: "King" });
  });

  it("rejects renaming an inactive user", () => {
    expectDomainError(
      () => applyUserUpdate(inactiveUser(), { lastName: "King" }, LATER),
      "USER_INACTIVE_RENAME",
    );
  });

  it("rejects activating and renaming in the same update (stored status wins)", () => {
    expectDomainError(
      () => applyUserUpdate(inactiveUser(), { status: "active", firstName: "Augusta" }, LATER),
      "USER_INACTIVE_RENAME",
    );
  });

  it("allows unchanged names for an inactive user, so a full edit form can be sent", () => {
    const updated = applyUserUpdate(
      inactiveUser(),
      { firstName: "Ada", lastName: "Lovelace", status: "active" },
      LATER,
    );

    expect(updated.status).toBe("active");
  });

  it("allows activating an inactive user, then renaming in a second update", () => {
    const activated = applyUserUpdate(inactiveUser(), { status: "active" }, LATER);

    expect(applyUserUpdate(activated, { firstName: "Augusta" }, LATER).firstName).toBe("Augusta");
  });

  it("updates password hash and the must-change flag", () => {
    const user = createUser(newUser(), CREATED_AT);

    const updated = applyUserUpdate(
      user,
      { passwordHash: "hash-2", mustChangePassword: true },
      LATER,
    );

    expect(updated).toMatchObject({ passwordHash: "hash-2", mustChangePassword: true });
  });

  it("does not mutate the original user", () => {
    const user = createUser(newUser(), CREATED_AT);

    applyUserUpdate(user, { firstName: "Augusta" }, LATER);

    expect(user.firstName).toBe("Ada");
  });
});

describe("softDeleteUser", () => {
  it("sets deletedAt and updatedAt, keeps createdAt", () => {
    const deleted = softDeleteUser(createUser(newUser(), CREATED_AT), LATER);

    expect(deleted).toMatchObject({ deletedAt: LATER, updatedAt: LATER, createdAt: CREATED_AT });
  });
});

describe("assertCanStartSession", () => {
  it("allows an active user", () => {
    expect(() => assertCanStartSession(createUser(newUser(), CREATED_AT))).not.toThrow();
  });

  it("rejects an inactive user", () => {
    expectDomainError(() => assertCanStartSession(inactiveUser()), "USER_INACTIVE");
  });

  it("rejects a deleted user as not found", () => {
    const deleted = softDeleteUser(createUser(newUser(), CREATED_AT), LATER);

    expectDomainError(() => assertCanStartSession(deleted), "USER_NOT_FOUND");
  });
});

describe("toPublicUser", () => {
  it("removes the password hash and the soft-delete marker", () => {
    const publicUser = toPublicUser(createUser(newUser(), CREATED_AT));

    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser).not.toHaveProperty("deletedAt");
    expect(publicUser.email).toBe("ada@example.com");
  });
});
