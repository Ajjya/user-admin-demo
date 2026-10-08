import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { setupTestDb } from "../helpers/test-db";

setupTestDb({ exposeToApp: true });

describe("GET /api/health", () => {
  it("returns 200 when the database answers a ping", async () => {
    const response = await health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
