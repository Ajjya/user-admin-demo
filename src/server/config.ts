import "server-only";
import { z } from "zod";

// Unset and empty variables are treated the same (Compose passes "" for unset optional ones).
const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const envSchema = z
  .object({
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    MONGODB_DB: z.string().min(1).default("user_admin"),
    SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
    SEED_DEMO_DATA: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SEED_ADMIN_PASSWORD: optionalString,
  })
  .superRefine((env, ctx) => {
    // Fail at startup rather than seeding an admin nobody can sign in as.
    if (env.SEED_DEMO_DATA && (env.SEED_ADMIN_PASSWORD?.length ?? 0) < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["SEED_ADMIN_PASSWORD"],
        message: "must be at least 8 characters when SEED_DEMO_DATA=true",
      });
    }
  });

export type Config = z.infer<typeof envSchema>;

/** Pure and testable: validates an environment object or throws a readable error. */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
  }
  return result.data;
}

let cached: Config | undefined;

/**
 * Parsed on first use, not at import time: `next build` imports server modules without the
 * runtime environment, and a missing variable must fail the running server, not the build.
 */
export function getConfig(): Config {
  cached ??= parseConfig(process.env);
  return cached;
}
