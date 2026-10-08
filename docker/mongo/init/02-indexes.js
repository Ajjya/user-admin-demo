// Same indexes (and names) as src/server/db/indexes.ts. The app also creates them idempotently at
// startup, so it works against a database that was not created by this image.
// Note: mongosh's createIndex(key, options) differs from the Node driver's createIndexes(specs).
const appDb = db.getSiblingDB(process.env.MONGO_APP_DB);

appDb.users.createIndex({ email: 1 }, { name: "email_unique", unique: true });
appDb.users.createIndex({ deletedAt: 1, createdAt: -1, _id: -1 }, { name: "list_active_newest" });
appDb.sessions.createIndex({ userId: 1, terminatedAt: 1 }, { name: "user_active_sessions" });
appDb.sessions.createIndex({ expiresAt: 1 }, { name: "expired_sessions_ttl", expireAfterSeconds: 0 });

print(`Created indexes in "${process.env.MONGO_APP_DB}"`);
