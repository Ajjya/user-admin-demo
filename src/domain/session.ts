export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly terminatedAt: Date | null;
}

/** Absolute TTL: the expiry is fixed at creation and never extended by activity. */
export function createSession(
  params: { id: string; userId: string },
  now: Date,
  ttlMs: number,
): Session {
  return {
    id: params.id,
    userId: params.userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
    terminatedAt: null,
  };
}

export function isSessionActive(session: Session, now: Date): boolean {
  return session.terminatedAt === null && session.expiresAt.getTime() > now.getTime();
}

/** Idempotent: terminating twice keeps the original termination time. */
export function terminateSession(session: Session, now: Date): Session {
  if (session.terminatedAt !== null) {
    return session;
  }
  return { ...session, terminatedAt: now };
}
