import "server-only";
import { randomUUID } from "node:crypto";
import { getConfig } from "@/server/config";
import { getDb } from "@/server/db/mongo";
import { MongoSessionRepository } from "@/server/repositories/mongo/mongo-session-repository";
import { MongoUserRepository } from "@/server/repositories/mongo/mongo-user-repository";
import { Argon2PasswordHasher } from "@/server/security/password";
import { AuthService } from "@/server/services/auth-service";
import { SessionService } from "@/server/services/session-service";

export interface Services {
  authService: AuthService;
  sessionService: SessionService;
}

const HOUR_MS = 60 * 60 * 1000;

let services: Services | undefined;

/**
 * Composition root: the only place that knows the concrete implementations. Built on first use
 * (like getConfig) and reused for the life of the process. Plain constructor injection instead
 * of a DI container: there are only a handful of objects.
 */
export function getServices(): Services {
  if (!services) {
    const db = getDb();
    const users = new MongoUserRepository(db);
    const sessions = new MongoSessionRepository(db);
    const clock = (): Date => new Date();

    const sessionService = new SessionService({
      users,
      sessions,
      clock,
      generateId: randomUUID,
      ttlMs: getConfig().SESSION_TTL_HOURS * HOUR_MS,
    });
    const authService = new AuthService({
      users,
      sessionService,
      hasher: new Argon2PasswordHasher(),
      clock,
      generateId: randomUUID,
    });
    services = { authService, sessionService };
  }
  return services;
}
