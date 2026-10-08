import { randomUUID } from "node:crypto";
import { MongoClient, type Db } from "mongodb";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import { ensureIndexes } from "@/server/db/indexes";

/**
 * Gives the calling test file an isolated database with the production indexes.
 * Collections are emptied before each test; the database is dropped after the file.
 * With `exposeToApp`, the app's own config (getDb/getServices) points at the same database,
 * so Route Handlers can be called directly.
 */
export function setupTestDb(options: { exposeToApp?: boolean } = {}): () => Db {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    const uri = inject("mongoUri");
    const name = `test_${randomUUID().replaceAll("-", "")}`;
    if (options.exposeToApp) {
      process.env.MONGODB_URI = uri;
      process.env.MONGODB_DB = name;
    }
    client = new MongoClient(uri);
    db = client.db(name);
    await ensureIndexes(db);
  });

  beforeEach(async () => {
    await Promise.all([db.collection("users").deleteMany({}), db.collection("sessions").deleteMany({})]);
  });

  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  return () => db;
}
