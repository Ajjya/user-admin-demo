import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the "@/*" alias from tsconfig.json, so tests import modules the same way as the app.
  resolve: { tsconfigPaths: true },
  test: {
    // The integration project has no tests until the MongoDB layer exists (task 4).
    passWithNoTests: true,
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
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/server/services/**"],
    },
  },
});
