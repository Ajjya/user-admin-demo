import type { PasswordHasher } from "@/server/security/password";

/** Instant and readable instead of Argon2 (which takes ~50 ms per call by design). */
export class FakePasswordHasher implements PasswordHasher {
  verifyCalls = 0;

  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    this.verifyCalls += 1;
    return passwordHash === `hashed:${password}`;
  }
}

/** A clock that only moves when the test says so. */
export class FakeClock {
  private current: Date;

  constructor(start = new Date("2026-01-01T10:00:00Z")) {
    this.current = start;
  }

  readonly now = (): Date => new Date(this.current);

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Predictable ids: "id-1", "id-2", ... */
export function sequentialIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
}
