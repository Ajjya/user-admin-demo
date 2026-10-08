// Runs once when a Next.js server instance starts, before it handles requests.
export async function register(): Promise<void> {
  // The MongoDB driver needs Node.js APIs; skip the Edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { getDb } = await import("@/server/db/mongo");
  const { ensureIndexes } = await import("@/server/db/indexes");
  const { logger } = await import("@/server/logger");

  await ensureIndexes(getDb());
  logger.info("MongoDB indexes ensured");
}
