import { getDb } from "@/server/db/mongo";
import { errorResponse } from "@/server/http/errors";
import { logger } from "@/server/logger";

/** Liveness + database check, used by the Docker healthcheck. Public and never cached. */
export async function GET(): Promise<Response> {
  try {
    await getDb().command({ ping: 1 });
    return Response.json({ status: "ok" });
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    return errorResponse("SERVICE_UNAVAILABLE", "Database is unavailable");
  }
}
