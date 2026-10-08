import { describe, expect, it } from "vitest";

// Placeholder that proves the Vitest setup works; removed when the domain tests land (task 2).
describe("test setup", () => {
  it("runs on Node.js 22 or newer", () => {
    const major = Number(process.versions.node.split(".")[0]);
    expect(major).toBeGreaterThanOrEqual(22);
  });
});
