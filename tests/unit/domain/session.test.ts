import { describe, expect, it } from "vitest";
import { createSession, isSessionActive, terminateSession } from "@/domain/session";

const HOUR_MS = 60 * 60 * 1000;
const CREATED_AT = new Date("2026-01-01T10:00:00Z");

function at(offsetMs: number): Date {
  return new Date(CREATED_AT.getTime() + offsetMs);
}

function newSession(): ReturnType<typeof createSession> {
  return createSession({ id: "session-1", userId: "user-1" }, CREATED_AT, 24 * HOUR_MS);
}

describe("createSession", () => {
  it("starts not terminated and expires after the TTL", () => {
    const session = newSession();

    expect(session).toMatchObject({
      id: "session-1",
      userId: "user-1",
      createdAt: CREATED_AT,
      expiresAt: at(24 * HOUR_MS),
      terminatedAt: null,
    });
  });
});

describe("createSession userAgent", () => {
  it("is null when absent or blank", () => {
    expect(newSession().userAgent).toBeNull();
    const blank = createSession({ id: "s", userId: "u", userAgent: "   " }, CREATED_AT, HOUR_MS);
    expect(blank.userAgent).toBeNull();
  });

  it("is trimmed and limited to 256 characters", () => {
    const session = createSession(
      { id: "s", userId: "u", userAgent: `  ${"x".repeat(300)}  ` },
      CREATED_AT,
      HOUR_MS,
    );

    expect(session.userAgent).toHaveLength(256);
  });
});

describe("isSessionActive", () => {
  it("is active before expiry", () => {
    expect(isSessionActive(newSession(), at(24 * HOUR_MS - 1))).toBe(true);
  });

  it("is inactive exactly at expiry and after (absolute TTL)", () => {
    expect(isSessionActive(newSession(), at(24 * HOUR_MS))).toBe(false);
    expect(isSessionActive(newSession(), at(25 * HOUR_MS))).toBe(false);
  });

  it("is inactive once terminated, even before expiry", () => {
    const terminated = terminateSession(newSession(), at(HOUR_MS));

    expect(isSessionActive(terminated, at(2 * HOUR_MS))).toBe(false);
  });
});

describe("terminateSession", () => {
  it("sets terminatedAt", () => {
    expect(terminateSession(newSession(), at(HOUR_MS)).terminatedAt).toEqual(at(HOUR_MS));
  });

  it("is idempotent and keeps the first termination time", () => {
    const first = terminateSession(newSession(), at(HOUR_MS));

    expect(terminateSession(first, at(2 * HOUR_MS)).terminatedAt).toEqual(at(HOUR_MS));
  });
});
