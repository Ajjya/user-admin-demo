import { describe, expect, it } from "vitest";
import { parseConfig } from "@/server/config";

const base = { MONGODB_URI: "mongodb://localhost:27017" };

describe("parseConfig", () => {
  it("applies defaults", () => {
    expect(parseConfig(base)).toEqual({
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB: "user_admin",
      SESSION_TTL_HOURS: 24,
      SEED_DEMO_DATA: false,
      SEED_ADMIN_PASSWORD: undefined,
    });
  });

  it("requires MONGODB_URI", () => {
    expect(() => parseConfig({})).toThrow(/MONGODB_URI/);
  });

  it("enables the seed with a password", () => {
    const config = parseConfig({ ...base, SEED_DEMO_DATA: "true", SEED_ADMIN_PASSWORD: "demo-password" });

    expect(config.SEED_DEMO_DATA).toBe(true);
    expect(config.SEED_ADMIN_PASSWORD).toBe("demo-password");
  });

  it.each([
    ["missing", undefined],
    ["empty (as Compose passes unset variables)", ""],
    ["too short", "short"],
  ])("fails fast when the seed is on and the admin password is %s", (_label, password) => {
    expect(() =>
      parseConfig({ ...base, SEED_DEMO_DATA: "true", SEED_ADMIN_PASSWORD: password }),
    ).toThrow(/SEED_ADMIN_PASSWORD/);
  });

  it("ignores the admin password while the seed is off", () => {
    expect(() => parseConfig({ ...base, SEED_DEMO_DATA: "false", SEED_ADMIN_PASSWORD: "" })).not.toThrow();
  });

  it("rejects an invalid flag value", () => {
    expect(() => parseConfig({ ...base, SEED_DEMO_DATA: "yes" })).toThrow(/SEED_DEMO_DATA/);
  });
});
