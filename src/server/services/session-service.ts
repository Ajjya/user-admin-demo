import "server-only";
import type { Clock } from "@/domain/clock";
import { DomainError } from "@/domain/errors";
import { createSession, isSessionActive, terminateSession, type Session } from "@/domain/session";
import type { User } from "@/domain/user";
import type { SessionRepository } from "@/server/repositories/session-repository";
import type { UserRepository } from "@/server/repositories/user-repository";

export interface AuthenticatedSession {
  session: Session;
  user: User;
}

export interface SessionServiceDeps {
  users: UserRepository;
  sessions: SessionRepository;
  clock: Clock;
  generateId: () => string;
  ttlMs: number;
}

export class SessionService {
  constructor(private readonly deps: SessionServiceDeps) {}

  /**
   * Counts the login and creates the session. The status check and the increment are one atomic
   * operation, so a user deactivated concurrently cannot slip through. If the insert fails after
   * the increment, the counter is one too high: harmless and avoids a transaction.
   */
  async startSession(userId: string): Promise<AuthenticatedSession> {
    const user = await this.deps.users.incrementLoginsIfActive(userId);
    if (!user) {
      throw new DomainError("USER_INACTIVE", "Your account is inactive");
    }
    const session = createSession(
      { id: this.deps.generateId(), userId },
      this.deps.clock(),
      this.deps.ttlMs,
    );
    await this.deps.sessions.insert(session);
    return { session, user };
  }

  /** Returns null for unknown, terminated or expired sessions and for inactive or deleted users. */
  async getActiveSession(sessionId: string): Promise<AuthenticatedSession | null> {
    const session = await this.deps.sessions.findById(sessionId);
    if (!session || !isSessionActive(session, this.deps.clock())) {
      return null;
    }
    // Deactivation and deletion also terminate sessions; this check is defence in depth.
    const user = await this.deps.users.findById(session.userId);
    if (!user || user.status !== "active") {
      return null;
    }
    return { session, user };
  }

  /** Users may only terminate their own sessions; anything else looks like "not found". */
  async terminate(sessionId: string, actorUserId: string): Promise<void> {
    const session = await this.deps.sessions.findById(sessionId);
    if (!session || session.userId !== actorUserId) {
      throw new DomainError("SESSION_NOT_FOUND", "Session not found");
    }
    await this.deps.sessions.save(terminateSession(session, this.deps.clock()));
  }

  async terminateAllForUser(userId: string): Promise<void> {
    await this.deps.sessions.terminateAllForUser(userId, this.deps.clock());
  }
}
