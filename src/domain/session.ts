export interface Session {
  readonly id: string;
  readonly userId: string;
  /** The browser or client that signed in, so users can tell their sessions apart. */
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly terminatedAt: Date | null;
}

const USER_AGENT_MAX_LENGTH = 256;

/** Absolute TTL: the expiry is fixed at creation and never extended by activity. */
export function createSession(
  params: { id: string; userId: string; userAgent?: string | null },
  now: Date,
  ttlMs: number,
): Session {
  // Client-supplied header: stored trimmed and bounded, never trusted for anything but display.
  const userAgent = params.userAgent?.trim().slice(0, USER_AGENT_MAX_LENGTH) || null;
  return {
    id: params.id,
    userId: params.userId,
    userAgent,
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
