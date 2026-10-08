import "server-only";
import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("user_admin"),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
});

export type Config = z.infer<typeof envSchema>;

let cached: Config | undefined;

/**
 * Parsed on first use, not at import time: `next build` imports server modules without the
 * runtime environment, and a missing variable must fail the running server, not the build.
 */
export function getConfig(): Config {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
    }
    cached = result.data;
  }
  return cached;
}
