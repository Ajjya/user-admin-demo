import "server-only";
import pino from "pino";

/** Structured JSON logs. Credentials and session ids are redacted wherever they appear. */
export const logger = pino({
  // Read directly (not via getConfig) so logging works even when the rest of the config is invalid;
  // pino throws on an unknown level, which fails fast at startup.
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "newPassword",
      "passwordHash",
      "sessionId",
      "*.password",
      "*.newPassword",
      "*.passwordHash",
      "*.sessionId",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});
