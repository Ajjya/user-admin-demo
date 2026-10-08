import { DomainError } from "./errors";

export type UserStatus = "active" | "inactive";

export interface User {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly status: UserStatus;
  readonly loginsCounter: number;
  readonly mustChangePassword: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

/** The user as exposed outside the server: no credentials, no soft-delete marker. */
export type PublicUser = Omit<User, "passwordHash" | "deletedAt">;

export interface NewUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  mustChangePassword: boolean;
}

/** The only fields an update may touch; `email` and `createdAt` are deliberately absent. */
export interface UserChanges {
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
  passwordHash?: string;
  mustChangePassword?: boolean;
}

/** Emails are unique case-insensitively, so they are always stored trimmed and lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUser(input: NewUser, now: Date): User {
  return {
    id: input.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
    status: input.status,
    loginsCounter: 0,
    mustChangePassword: input.mustChangePassword,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/**
 * Returns the updated user. Fields are copied one by one (never spread from `changes`), so
 * `createdAt` and `email` cannot change even if a caller smuggles them in at runtime.
 */
export function applyUserUpdate(user: User, changes: UserChanges, now: Date): User {
  const renames =
    (changes.firstName !== undefined && changes.firstName !== user.firstName) ||
    (changes.lastName !== undefined && changes.lastName !== user.lastName);

  // Checked against the stored status: activating and renaming in one update is rejected.
  if (renames && user.status === "inactive") {
    throw new DomainError(
      "USER_INACTIVE_RENAME",
      "First and last name cannot be changed while the user is inactive",
    );
  }

  return {
    ...user,
    firstName: changes.firstName ?? user.firstName,
    lastName: changes.lastName ?? user.lastName,
    status: changes.status ?? user.status,
    passwordHash: changes.passwordHash ?? user.passwordHash,
    mustChangePassword: changes.mustChangePassword ?? user.mustChangePassword,
    updatedAt: now,
  };
}

export function softDeleteUser(user: User, now: Date): User {
  return { ...user, deletedAt: now, updatedAt: now };
}

export function assertCanStartSession(user: User): void {
  if (user.deletedAt !== null) {
    throw new DomainError("USER_NOT_FOUND", "User not found");
  }
  if (user.status === "inactive") {
    throw new DomainError("USER_INACTIVE", "Your account is inactive");
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    loginsCounter: user.loginsCounter,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
