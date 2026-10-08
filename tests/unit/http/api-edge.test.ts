import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DomainError } from "@/domain/errors";
import { withApi } from "@/server/http/handler";

vi.mock("@/server/logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/server/db/mongo", () => ({
  getDb: () => ({
    command: async () => {
      throw new Error("connection refused");
    },
  }),
}));

const request = new NextRequest("http://localhost/api/anything");

describe("withApi", () => {
  it("maps a DomainError to its status and JSON body", async () => {
    const handler = withApi(async () => {
      throw new DomainError("USER_INACTIVE_RENAME", "Cannot rename");
    });

    const response = await handler(request, undefined);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: { code: "USER_INACTIVE_RENAME", message: "Cannot rename" },
    });
  });

  it("hides unexpected errors behind a generic 500 with a request id", async () => {
    const handler = withApi(async () => {
      throw new Error("secret stack detail");
    });

    const response = await handler(request, undefined);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret stack detail");
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("GET /api/health", () => {
  it("returns 503 when the database is unreachable", async () => {
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
