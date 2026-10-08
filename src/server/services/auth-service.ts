import "server-only";
import type { Clock } from "@/domain/clock";
import { DomainError } from "@/domain/errors";
import {
  applyUserUpdate,
  assertCanStartSession,
  createUser,
  normalizeEmail,
  type User,
} from "@/domain/user";
import type { UserRepository } from "@/server/repositories/user-repository";
import type { PasswordHasher } from "@/server/security/password";
import type { AuthenticatedSession, SessionService } from "@/server/services/session-service";
import type { SignInInput, SignUpInput } from "@/shared/schemas";

/** Where the sign-in comes from; stored on the session for display only. */
export interface SignInContext {
  userAgent?: string | null;
}

export interface AuthServiceDeps {
  users: UserRepository;
  sessionService: SessionService;
  hasher: PasswordHasher;
  clock: Clock;
  generateId: () => string;
}

function invalidCredentials(): DomainError {
  // One message for unknown email, deleted user and wrong password: no account enumeration.
  return new DomainError("INVALID_CREDENTIALS", "Invalid email or password");
}

export class AuthService {
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly deps: AuthServiceDeps) {}

  async signUp(input: SignUpInput, context: SignInContext = {}): Promise<AuthenticatedSession> {
    const user = createUser(
      {
        id: this.deps.generateId(),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: await this.deps.hasher.hash(input.password),
        status: "active",
        mustChangePassword: false,
      },
      this.deps.clock(),
    );
    await this.deps.users.insert(user);
    return this.deps.sessionService.startSession(user.id, context.userAgent);
  }

  async signIn(input: SignInInput, context: SignInContext = {}): Promise<AuthenticatedSession> {
    const user = await this.deps.users.findByEmail(normalizeEmail(input.email));
    if (!user || user.deletedAt !== null) {
      // Spend the same hashing time as a real check, so response time does not reveal emails.
      await this.deps.hasher.verify(await this.getDummyHash(), input.password);
      throw invalidCredentials();
    }
    if (!(await this.deps.hasher.verify(user.passwordHash, input.password))) {
      throw invalidCredentials();
    }
    // Only after the password is proven correct may we reveal that the account is inactive.
    assertCanStartSession(user);
    return this.deps.sessionService.startSession(user.id, context.userAgent);
  }

  /** The forced change after an admin-set temporary password; the current session stays valid. */
  async changeOwnPassword(userId: string, newPassword: string): Promise<User> {
    const user = await this.deps.users.findById(userId);
    if (!user) {
      throw new DomainError("USER_NOT_FOUND", "User not found");
    }
    if (!user.mustChangePassword) {
      throw new DomainError("PASSWORD_CHANGE_NOT_REQUIRED", "Password change is not required");
    }
    if (await this.deps.hasher.verify(user.passwordHash, newPassword)) {
      throw new DomainError(
        "PASSWORD_UNCHANGED",
        "The new password must differ from the temporary one",
      );
    }
    const updated = applyUserUpdate(
      user,
      { passwordHash: await this.deps.hasher.hash(newPassword), mustChangePassword: false },
      this.deps.clock(),
    );
    await this.deps.users.save(updated);
    return updated;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.deps.hasher.hash(this.deps.generateId());
    return this.dummyHash;
  }
}
