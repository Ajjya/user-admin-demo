import { randomUUID } from "node:crypto";
import { MongoClient, type Db } from "mongodb";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import { ensureIndexes } from "@/server/db/indexes";

/**
 * Gives the calling test file an isolated database with the production indexes.
 * Collections are emptied before each test; the database is dropped after the file.
 */
export function setupTestDb(): () => Db {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = new MongoClient(inject("mongoUri"));
    db = client.db(`test_${randomUUID().replaceAll("-", "")}`);
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
