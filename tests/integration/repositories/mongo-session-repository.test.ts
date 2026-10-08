import { describe, expect, it } from "vitest";
import { createSession, terminateSession, type Session } from "@/domain/session";
import { sessionsCollection } from "@/server/db/collections";
import { MongoSessionRepository } from "@/server/repositories/mongo/mongo-session-repository";
import { setupTestDb } from "../helpers/test-db";

const getDb = setupTestDb();
const NOW = new Date("2026-01-01T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

let sequence = 0;
function makeSession(userId: string): Session {
  sequence += 1;
  return createSession({ id: `session-${sequence}`, userId }, NOW, DAY_MS);
}

function repository(): MongoSessionRepository {
  return new MongoSessionRepository(getDb());
}

describe("MongoSessionRepository", () => {
  it("inserts and finds a session", async () => {
    const session = makeSession("user-1");
    await repository().insert(session);

    expect(await repository().findById(session.id)).toEqual(session);
    expect(await repository().findById("missing")).toBeNull();
  });

  it("saves terminatedAt", async () => {
    const session = makeSession("user-1");
    await repository().insert(session);
    const terminated = terminateSession(session, new Date(NOW.getTime() + 1000));

    await repository().save(terminated);

    expect((await repository().findById(session.id))?.terminatedAt).toEqual(
      terminated.terminatedAt,
    );
  });

  it("lists only the user's active sessions, newest first", async () => {
    const later = new Date(NOW.getTime() + 1000);
    const newer = createSession({ id: "newer", userId: "user-1", userAgent: "Chrome" }, later, DAY_MS);
    const older = makeSession("user-1");
    const terminated = terminateSession(makeSession("user-1"), NOW);
    const twoDaysAgo = new Date(NOW.getTime() - 2 * DAY_MS);
    const expired = createSession({ id: "expired", userId: "user-1" }, twoDaysAgo, DAY_MS);
    for (const session of [older, newer, terminated, expired, makeSession("user-2")]) {
      await repository().insert(session);
    }

    const active = await repository().listActiveForUser("user-1", NOW);

    expect(active.map((s) => s.id)).toEqual(["newer", older.id]);
    expect(active[0].userAgent).toBe("Chrome");
  });

  it("reads sessions stored before userAgent existed as userAgent null", async () => {
    const legacy = makeSession("user-1");
    // Written the old way: no userAgent field at all.
    await sessionsCollection(getDb()).insertOne({
      _id: legacy.id,
      userId: legacy.userId,
      createdAt: legacy.createdAt,
      expiresAt: legacy.expiresAt,
      terminatedAt: null,
    } as never);

    expect((await repository().findById(legacy.id))?.userAgent).toBeNull();
  });

  it("terminates only the user's active sessions", async () => {
    const earlier = new Date(NOW.getTime() + 1000);
    const later = new Date(NOW.getTime() + 2000);
    const active1 = makeSession("user-1");
    const active2 = makeSession("user-1");
    const alreadyTerminated = terminateSession(makeSession("user-1"), earlier);
    const otherUser = makeSession("user-2");
    for (const session of [active1, active2, alreadyTerminated, otherUser]) {
      await repository().insert(session);
    }

    const count = await repository().terminateAllForUser("user-1", later);

    expect(count).toBe(2);
    expect((await repository().findById(active1.id))?.terminatedAt).toEqual(later);
    expect((await repository().findById(active2.id))?.terminatedAt).toEqual(later);
    expect((await repository().findById(alreadyTerminated.id))?.terminatedAt).toEqual(earlier);
    expect((await repository().findById(otherUser.id))?.terminatedAt).toBeNull();
  });
});
