import { describe, expect, it } from "vitest";
import { createSession, terminateSession, type Session } from "@/domain/session";
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
