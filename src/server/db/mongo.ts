import "server-only";
import { MongoClient, type Db } from "mongodb";
import { getConfig } from "@/server/config";

// One client (and connection pool) per process. It lives on globalThis because `next dev`
// re-evaluates modules on every hot reload, which would otherwise open a new pool each time.
const globalForMongo = globalThis as typeof globalThis & { mongoClient?: MongoClient };

export function getMongoClient(): MongoClient {
  if (!globalForMongo.mongoClient) {
    // The driver connects lazily on the first operation. Fail after 5 s instead of the default
    // 30 s when the database is unreachable, so health checks answer 503 quickly.
    globalForMongo.mongoClient = new MongoClient(getConfig().MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  return globalForMongo.mongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(getConfig().MONGODB_DB);
}
