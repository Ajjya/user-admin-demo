import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { applyUserUpdate, createUser, softDeleteUser, type User } from "@/domain/user";
import { usersCollection } from "@/server/db/collections";
import { MongoUserRepository } from "@/server/repositories/mongo/mongo-user-repository";
import { setupTestDb } from "../helpers/test-db";

const getDb = setupTestDb();
const BASE_TIME = new Date("2026-01-01T00:00:00Z").getTime();

let sequence = 0;
function makeUser(overrides: Partial<User> = {}, createdAtOffsetMs = 0): User {
  sequence += 1;
  const user = createUser(
    {
      id: `user-${sequence}`,
      firstName: "Ada",
      lastName: `Lovelace ${sequence}`,
      email: `ada${sequence}@example.com`,
      passwordHash: "hash",
      status: "active",
      mustChangePassword: false,
    },
    new Date(BASE_TIME + createdAtOffsetMs),
  );
  return { ...user, ...overrides };
}

function repository(): MongoUserRepository {
  return new MongoUserRepository(getDb());
}

describe("MongoUserRepository", () => {
  it("inserts and finds a user by id and by email", async () => {
    const user = makeUser();
    await repository().insert(user);

    expect(await repository().findById(user.id)).toEqual(user);
    expect(await repository().findByEmail(user.email)).toEqual(user);
  });

  it("stores the domain id as _id, without a separate id field", async () => {
    const user = makeUser();
    await repository().insert(user);

    const raw = await usersCollection(getDb()).findOne({ _id: user.id });
    expect(raw).not.toHaveProperty("id");
  });

  it("rejects a duplicate email with EMAIL_TAKEN", async () => {
    await repository().insert(makeUser({ email: "same@example.com" }));

    const duplicate = repository().insert(makeUser({ email: "same@example.com" }));

    await expect(duplicate).rejects.toBeInstanceOf(DomainError);
    await expect(duplicate).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("keeps a deleted user's email reserved", async () => {
    const user = makeUser({ email: "reserved@example.com" });
    await repository().insert(user);
    await repository().save(softDeleteUser(user, new Date()));

    await expect(
      repository().insert(makeUser({ email: "reserved@example.com" })),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("hides deleted users from findById, list and count, but not from findByEmail", async () => {
    const kept = makeUser();
    const deleted = makeUser();
    await repository().insert(kept);
    await repository().insert(deleted);
    await repository().save(softDeleteUser(deleted, new Date()));

    expect(await repository().findById(deleted.id)).toBeNull();
    expect(await repository().count()).toBe(1);
    expect((await repository().list({ skip: 0, limit: 10 })).map((u) => u.id)).toEqual([kept.id]);
    expect((await repository().findByEmail(deleted.email))?.deletedAt).not.toBeNull();
  });

  it("lists newest first with skip and limit", async () => {
    const users = [0, 1, 2, 3, 4].map((minute) => makeUser({}, minute * 60_000));
    for (const user of users) {
      await repository().insert(user);
    }
    const newestFirst = [...users].reverse().map((u) => u.id);

    const page1 = await repository().list({ skip: 0, limit: 2 });
    const page3 = await repository().list({ skip: 4, limit: 2 });

    expect(page1.map((u) => u.id)).toEqual(newestFirst.slice(0, 2));
    expect(page3.map((u) => u.id)).toEqual(newestFirst.slice(4));
  });

  it("orders users with the same createdAt deterministically", async () => {
    const sameTime = [makeUser(), makeUser(), makeUser()];
    for (const user of sameTime) {
      await repository().insert(user);
    }

    const first = await repository().list({ skip: 0, limit: 10 });
    const second = await repository().list({ skip: 0, limit: 10 });

    expect(first.map((u) => u.id)).toEqual(second.map((u) => u.id));
    expect(first.map((u) => u.id)).toEqual(sameTime.map((u) => u.id).sort().reverse());
  });

  it("saves mutable fields without touching createdAt, email or loginsCounter", async () => {
    const user = makeUser();
    await repository().insert(user);
    // Simulates a sign-in that happens after the user was loaded for editing.
    await repository().incrementLoginsIfActive(user.id);

    const edited = applyUserUpdate(user, { firstName: "Augusta" }, new Date(BASE_TIME + 1000));
    await repository().save({ ...edited, email: "changed@example.com", createdAt: new Date(0) });

    const stored = await repository().findById(user.id);
    expect(stored).toMatchObject({
      firstName: "Augusta",
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: edited.updatedAt,
      loginsCounter: 1,
    });
  });

  describe("incrementLoginsIfActive", () => {
    it("increments an active user and returns the updated user", async () => {
      const user = makeUser();
      await repository().insert(user);

      expect((await repository().incrementLoginsIfActive(user.id))?.loginsCounter).toBe(1);
      expect((await repository().incrementLoginsIfActive(user.id))?.loginsCounter).toBe(2);
    });

    it("does not increment an inactive user", async () => {
      const user = makeUser({ status: "inactive" });
      await repository().insert(user);

      expect(await repository().incrementLoginsIfActive(user.id)).toBeNull();
      expect((await usersCollection(getDb()).findOne({ _id: user.id }))?.loginsCounter).toBe(0);
    });

    it("does not increment a deleted user", async () => {
      const user = makeUser();
      await repository().insert(user);
      await repository().save(softDeleteUser(user, new Date()));

      expect(await repository().incrementLoginsIfActive(user.id)).toBeNull();
    });

    it("loses no increments under concurrency", async () => {
      const user = makeUser();
      await repository().insert(user);

      await Promise.all(
        Array.from({ length: 20 }, () => repository().incrementLoginsIfActive(user.id)),
      );

      expect((await repository().findById(user.id))?.loginsCounter).toBe(20);
    });
  });
});
