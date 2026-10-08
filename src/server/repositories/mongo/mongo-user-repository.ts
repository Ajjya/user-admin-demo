import "server-only";
import { MongoServerError, type Collection, type Db } from "mongodb";
import { DomainError } from "@/domain/errors";
import type { User } from "@/domain/user";
import { usersCollection, type UserDocument } from "@/server/db/collections";
import type { UserRepository } from "@/server/repositories/user-repository";

const DUPLICATE_KEY = 11000;
const NOT_DELETED = { deletedAt: null };

function toDocument({ id, ...rest }: User): UserDocument {
  return { _id: id, ...rest };
}

function toUser({ _id, ...rest }: UserDocument): User {
  return { id: _id, ...rest };
}

export class MongoUserRepository implements UserRepository {
  private readonly users: Collection<UserDocument>;

  constructor(db: Db) {
    this.users = usersCollection(db);
  }

  async insert(user: User): Promise<void> {
    try {
      await this.users.insertOne(toDocument(user));
    } catch (error) {
      // The unique index is the only race-safe uniqueness check.
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY) {
        throw new DomainError("EMAIL_TAKEN", "Email is already registered");
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const document = await this.users.findOne({ _id: id, ...NOT_DELETED });
    return document ? toUser(document) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const document = await this.users.findOne({ email });
    return document ? toUser(document) : null;
  }

  async list({ skip, limit }: { skip: number; limit: number }): Promise<User[]> {
    const documents = await this.users
      .find(NOT_DELETED)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    return documents.map(toUser);
  }

  async count(): Promise<number> {
    return this.users.countDocuments(NOT_DELETED);
  }

  async save(user: User): Promise<void> {
    // $set of the mutable fields instead of replaceOne: a full replace would overwrite a
    // concurrent $inc of loginsCounter with the stale value loaded before the update.
    await this.users.updateOne(
      { _id: user.id },
      {
        $set: {
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          passwordHash: user.passwordHash,
          mustChangePassword: user.mustChangePassword,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
        },
      },
    );
  }

  async incrementLoginsIfActive(id: string): Promise<User | null> {
    // The filter checks the domain rule and the update applies it in one atomic operation,
    // so a user deactivated at the same moment cannot start a session.
    const document = await this.users.findOneAndUpdate(
      { _id: id, status: "active", ...NOT_DELETED },
      { $inc: { loginsCounter: 1 } },
      { returnDocument: "after" },
    );
    return document ? toUser(document) : null;
  }
}
