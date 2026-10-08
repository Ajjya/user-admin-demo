import "server-only";
import type { Clock } from "@/domain/clock";
import { DomainError } from "@/domain/errors";
import {
  applyUserUpdate,
  createUser,
  softDeleteUser,
  toPublicUser,
  type PublicUser,
  type User,
  type UserChanges,
} from "@/domain/user";
import type { UserRepository } from "@/server/repositories/user-repository";
import type { PasswordHasher } from "@/server/security/password";
import type { SessionService } from "@/server/services/session-service";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "@/shared/schemas";

export interface UserPage {
  items: PublicUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserServiceDeps {
  users: UserRepository;
  sessionService: SessionService;
  hasher: PasswordHasher;
  clock: Clock;
  generateId: () => string;
}

function cannotModifySelf(action: string): DomainError {
  return new DomainError("CANNOT_MODIFY_SELF", `You cannot ${action} your own account`);
}

/** Every method returns PublicUser, so no caller can leak a password hash by accident. */
export class UserService {
  constructor(private readonly deps: UserServiceDeps) {}

  async list({ page, pageSize }: ListUsersQuery): Promise<UserPage> {
    const total = await this.deps.users.count();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // A page past the end (e.g. after deleting the last user on it) shows the last page instead.
    const currentPage = Math.min(page, totalPages);
    const users = await this.deps.users.list({
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    });
    return { items: users.map(toPublicUser), page: currentPage, pageSize, total, totalPages };
  }

  /** The admin sets a temporary password; the new user must replace it after signing in. */
  async create(input: CreateUserInput): Promise<PublicUser> {
    const user = createUser(
      {
        id: this.deps.generateId(),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: await this.deps.hasher.hash(input.password),
        status: input.status,
        mustChangePassword: true,
      },
      this.deps.clock(),
    );
    await this.deps.users.insert(user);
    return toPublicUser(user);
  }

  async update(actorId: string, targetId: string, input: UpdateUserInput): Promise<PublicUser> {
    const isSelf = actorId === targetId;
    if (isSelf && input.status === "inactive") {
      throw cannotModifySelf("deactivate");
    }
    const target = await this.findExisting(targetId);

    const changes: UserChanges = {
      firstName: input.firstName,
      lastName: input.lastName,
      status: input.status,
    };
    if (input.password !== undefined) {
      changes.passwordHash = await this.deps.hasher.hash(input.password);
      // A password set by another admin is temporary; your own new password is not.
      changes.mustChangePassword = !isSelf;
    }

    const updated = applyUserUpdate(target, changes, this.deps.clock());
    await this.deps.users.save(updated);

    const deactivated = target.status === "active" && updated.status === "inactive";
    const resetByAdmin = input.password !== undefined && !isSelf;
    if (deactivated || resetByAdmin) {
      await this.deps.sessionService.terminateAllForUser(target.id);
    }
    return toPublicUser(updated);
  }

  /** Soft delete: the record (and its reserved email) stays, but it is invisible everywhere. */
  async remove(actorId: string, targetId: string): Promise<void> {
    if (actorId === targetId) {
      throw cannotModifySelf("delete");
    }
    const target = await this.findExisting(targetId);
    await this.deps.users.save(softDeleteUser(target, this.deps.clock()));
    await this.deps.sessionService.terminateAllForUser(target.id);
  }

  private async findExisting(id: string): Promise<User> {
    const user = await this.deps.users.findById(id);
    if (!user) {
      throw new DomainError("USER_NOT_FOUND", "User not found");
    }
    return user;
  }
}
