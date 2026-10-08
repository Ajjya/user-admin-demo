import { DomainError } from "@/domain/errors";
import type { User } from "@/domain/user";
import type { UserRepository } from "@/server/repositories/user-repository";

/** Mirrors MongoUserRepository semantics; the integration tests prove the real one behaves the same. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async insert(user: User): Promise<void> {
    if ([...this.users.values()].some((existing) => existing.email === user.email)) {
      throw new DomainError("EMAIL_TAKEN", "Email is already registered");
    }
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user && user.deletedAt === null ? user : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async list({ skip, limit }: { skip: number; limit: number }): Promise<User[]> {
    return this.notDeleted()
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
      )
      .slice(skip, skip + limit);
  }

  async count(): Promise<number> {
    return this.notDeleted().length;
  }

  async save(user: User): Promise<void> {
    const stored = this.users.get(user.id);
    if (!stored) {
      return;
    }
    this.users.set(user.id, {
      ...stored,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      passwordHash: user.passwordHash,
      mustChangePassword: user.mustChangePassword,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    });
  }

  async incrementLoginsIfActive(id: string): Promise<User | null> {
    const user = this.users.get(id);
    if (!user || user.status !== "active" || user.deletedAt !== null) {
      return null;
    }
    const updated = { ...user, loginsCounter: user.loginsCounter + 1 };
    this.users.set(id, updated);
    return updated;
  }

  /** Test helper: raw access, deleted users included. */
  get(id: string): User | undefined {
    return this.users.get(id);
  }

  private notDeleted(): User[] {
    return [...this.users.values()].filter((user) => user.deletedAt === null);
  }
}
