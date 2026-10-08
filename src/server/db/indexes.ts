import "server-only";
import type { Db } from "mongodb";
import { sessionsCollection, usersCollection } from "@/server/db/collections";

/**
 * Idempotent: createIndex is a no-op when an identical index exists. Runs at startup so the app
 * also works against a database that was not created by our MongoDB image's init scripts.
 * Keep in sync with docker/mongo/init/02-indexes.js.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  await usersCollection(db).createIndexes([
    // Race-safe uniqueness; deleted users keep their email reserved.
    { key: { email: 1 }, name: "email_unique", unique: true },
    // Paginated list of non-deleted users, newest first; _id makes the order stable.
    { key: { deletedAt: 1, createdAt: -1, _id: -1 }, name: "list_active_newest" },
  ]);
  await sessionsCollection(db).createIndexes([
    { key: { userId: 1, terminatedAt: 1 }, name: "user_active_sessions" },
  ]);
}
