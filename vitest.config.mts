import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve the "@/*" alias from tsconfig.json, so tests import modules the same way as the app.
    tsconfigPaths: true,
    alias: {
      // Next.js swaps "server-only" for an empty module on the server; do the same in tests.
      "server-only": fileURLToPath(new URL("node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // Starts one in-memory mongod; the first run also downloads the binary.
          globalSetup: ["tests/integration/global-setup.ts"],
          env: { LOG_LEVEL: "silent" },
          hookTimeout: 60_000,
          testTimeout: 15_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/server/services/**"],
      // Pure wiring of real implementations; exercised by the API and e2e tests instead.
      exclude: ["src/server/services/container.ts"],
      // `yarn test:coverage` fails below this; business rules must stay tested.
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
