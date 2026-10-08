import type { Session } from "@/domain/session";

export interface SessionRepository {
  insert(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  /** Persists terminatedAt, the only mutable field of a session. */
  save(session: Session): Promise<void>;
  /** Terminates every not-yet-terminated session of the user. Returns how many were terminated. */
  terminateAllForUser(userId: string, now: Date): Promise<number>;
}
