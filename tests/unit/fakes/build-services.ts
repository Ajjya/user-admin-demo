import { AuthService } from "@/server/services/auth-service";
import { SessionService } from "@/server/services/session-service";
import { FakeClock, FakePasswordHasher, sequentialIds } from "./fakes";
import { InMemorySessionRepository } from "./in-memory-session-repository";
import { InMemoryUserRepository } from "./in-memory-user-repository";

export const TTL_MS = 24 * 60 * 60 * 1000;

/** The same wiring as server/services/container.ts, with fakes instead of MongoDB and Argon2. */
export function buildServices(): {
  users: InMemoryUserRepository;
  sessions: InMemorySessionRepository;
  hasher: FakePasswordHasher;
  clock: FakeClock;
  sessionService: SessionService;
  authService: AuthService;
} {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const hasher = new FakePasswordHasher();
  const clock = new FakeClock();
  const generateId = sequentialIds();

  const sessionService = new SessionService({
    users,
    sessions,
    clock: clock.now,
    generateId,
    ttlMs: TTL_MS,
  });
  const authService = new AuthService({
    users,
    sessionService,
    hasher,
    clock: clock.now,
    generateId,
  });
  return { users, sessions, hasher, clock, sessionService, authService };
}
