import type { Session } from "@/domain/session";
import type { SessionRepository } from "@/server/repositories/session-repository";

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  async insert(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async save(session: Session): Promise<void> {
    const stored = this.sessions.get(session.id);
    if (stored) {
      this.sessions.set(session.id, { ...stored, terminatedAt: session.terminatedAt });
    }
  }

  async listActiveForUser(userId: string, now: Date): Promise<Session[]> {
    return [...this.sessions.values()]
      .filter(
        (session) =>
          session.userId === userId &&
          session.terminatedAt === null &&
          session.expiresAt.getTime() > now.getTime(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async terminateAllForUser(userId: string, now: Date): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.terminatedAt === null) {
        this.sessions.set(session.id, { ...session, terminatedAt: now });
        count += 1;
      }
    }
    return count;
  }

  /** Test helper. */
  all(): Session[] {
    return [...this.sessions.values()];
  }
}
