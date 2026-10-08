import { describe, expect, it } from "vitest";
import { ensureIndexes } from "@/server/db/indexes";
import { setupTestDb } from "../helpers/test-db";

const getDb = setupTestDb();

describe("ensureIndexes", () => {
  it("is idempotent", async () => {
    // setupTestDb already ran it once; a second run must not fail or duplicate anything.
    await ensureIndexes(getDb());

    const userIndexes = await getDb().collection("users").indexes();
    const sessionIndexes = await getDb().collection("sessions").indexes();

    expect(userIndexes.map((index) => index.name).sort()).toEqual([
      "_id_",
      "email_unique",
      "list_active_newest",
    ]);
    expect(userIndexes.find((index) => index.name === "email_unique")?.unique).toBe(true);
    expect(sessionIndexes.map((index) => index.name).sort()).toEqual([
      "_id_",
      "expired_sessions_ttl",
      "user_active_sessions",
    ]);
    // TTL: MongoDB deletes a session as soon as its expiresAt has passed.
    expect(sessionIndexes.find((index) => index.name === "expired_sessions_ttl")).toMatchObject({
      key: { expiresAt: 1 },
      expireAfterSeconds: 0,
    });
  });
});
