import "server-only";
import type { Collection, Db } from "mongodb";
import type { Session } from "@/domain/session";
import type { User } from "@/domain/user";

// Documents store the domain id as `_id` (a UUID string), so no ObjectId leaks into the domain.
export type UserDocument = Omit<User, "id"> & { _id: string };
export type SessionDocument = Omit<Session, "id"> & { _id: string };

export function usersCollection(db: Db): Collection<UserDocument> {
  return db.collection<UserDocument>("users");
}

export function sessionsCollection(db: Db): Collection<SessionDocument> {
  return db.collection<SessionDocument>("sessions");
}
