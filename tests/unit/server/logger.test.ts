import pino from "pino";
import { describe, expect, it } from "vitest";
import { loggerOptions } from "@/server/logger";

/** Logs through the production options into memory and returns the JSON line. */
function logLine(payload: object): string {
  const lines: string[] = [];
  const logger = pino({ ...loggerOptions, level: "info" }, { write: (line: string) => lines.push(line) });
  logger.info(payload, "event");
  return lines[0];
}

describe("logger redaction", () => {
  it("never writes passwords, hashes or session ids, at the top level or one level deep", () => {
    const line = logLine({
      password: "plain-secret",
      newPassword: "plain-new-secret",
      passwordHash: "$argon2id$hash",
      sessionId: "11111111-2222-3333-4444-555555555555",
      body: { password: "nested-secret", passwordHash: "$argon2id$nested", sessionId: "nested-session" },
    });

    for (const secret of ["plain-secret", "plain-new-secret", "$argon2id", "11111111-2222", "nested-secret", "nested-session"]) {
      expect(line).not.toContain(secret);
    }
    expect(line).toContain("[REDACTED]");
  });

  it("never writes the authorization header or cookies", () => {
    const line = logLine({ headers: { authorization: "Bearer abc-session", cookie: "sid=abc-session", accept: "*/*" } });

    expect(line).not.toContain("abc-session");
    expect(line).toContain("*/*");
  });

  it("keeps ordinary fields readable", () => {
    const line = JSON.parse(logLine({ method: "POST", path: "/api/users", status: 201 }));

    expect(line).toMatchObject({ method: "POST", path: "/api/users", status: 201, msg: "event" });
  });
});
