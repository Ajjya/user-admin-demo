// Runs once when a Next.js server instance starts, before it handles requests.
export async function register(): Promise<void> {
  // The MongoDB driver needs Node.js APIs; skip the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { randomUUID } = await import("node:crypto");
  const { getConfig } = await import("@/server/config");
  const { getDb } = await import("@/server/db/mongo");
  const { ensureIndexes } = await import("@/server/db/indexes");
  const { logger } = await import("@/server/logger");

  const config = getConfig();
  await ensureIndexes(getDb());
  logger.info("MongoDB indexes ensured");

  if (config.SEED_DEMO_DATA && config.SEED_ADMIN_PASSWORD) {
    const { seedDemoData } = await import("@/server/seed");
    const { MongoUserRepository } = await import("@/server/repositories/mongo/mongo-user-repository");
    const { Argon2PasswordHasher } = await import("@/server/security/password");
    const seeded = await seedDemoData(
      {
        users: new MongoUserRepository(getDb()),
        hasher: new Argon2PasswordHasher(),
        clock: () => new Date(),
        generateId: randomUUID,
      },
      config.SEED_ADMIN_PASSWORD,
    );
    logger.info(seeded ? "Demo data created" : "Demo data skipped: the database already has users");
  }
}
