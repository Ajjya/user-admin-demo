import "server-only";
import type { Collection, Db } from "mongodb";
import type { Session } from "@/domain/session";
import { sessionsCollection, type SessionDocument } from "@/server/db/collections";
import type { SessionRepository } from "@/server/repositories/session-repository";

function toDocument({ id, ...rest }: Session): SessionDocument {
  return { _id: id, ...rest };
}

function toSession({ _id, ...rest }: SessionDocument): Session {
  return { id: _id, ...rest };
}

export class MongoSessionRepository implements SessionRepository {
  private readonly sessions: Collection<SessionDocument>;

  constructor(db: Db) {
    this.sessions = sessionsCollection(db);
  }

  async insert(session: Session): Promise<void> {
    await this.sessions.insertOne(toDocument(session));
  }

  async findById(id: string): Promise<Session | null> {
    const document = await this.sessions.findOne({ _id: id });
    return document ? toSession(document) : null;
  }

  async save(session: Session): Promise<void> {
    await this.sessions.updateOne(
      { _id: session.id },
      { $set: { terminatedAt: session.terminatedAt } },
    );
  }

  async terminateAllForUser(userId: string, now: Date): Promise<number> {
    const result = await this.sessions.updateMany(
      { userId, terminatedAt: null },
      { $set: { terminatedAt: now } },
    );
    return result.modifiedCount;
  }
}
