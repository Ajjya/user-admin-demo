// Started by Playwright's webServer: a fresh in-memory MongoDB, then the standalone production
// server, the same server.js the Docker image runs. No Docker needed, and every run begins with an
// empty database. Run with plain `node` (Node 26 strips TypeScript types natively).
import { spawn } from "node:child_process";
import { cpSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const port = process.env.E2E_PORT ?? "3100";

// The standalone output does not include static assets; the Dockerfile copies them the same way.
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });

const mongo = await MongoMemoryServer.create();

const app = spawn("node", [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: "127.0.0.1",
    MONGODB_URI: mongo.getUri(),
    MONGODB_DB: "e2e",
    LOG_LEVEL: "warn",
  },
});

let stopping = false;
async function stop(exitCode: number): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;
  app.kill("SIGTERM");
  await mongo.stop();
  process.exit(exitCode);
}

process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));
app.on("exit", (code) => void stop(code ?? 1));
