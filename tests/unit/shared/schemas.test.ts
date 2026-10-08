import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  changePasswordFormSchema,
  createUserSchema,
  listUsersQuerySchema,
  signInSchema,
  signUpFormSchema,
  signUpSchema,
  updateUserSchema,
} from "@/shared/schemas";

const validSignUp = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "correct-horse",
};

function issuePaths(result: z.ZodSafeParseResult<unknown>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("email", () => {
  it("is trimmed and lowercased", () => {
    const parsed = signUpSchema.parse({ ...validSignUp, email: "  Ada@Example.COM " });

    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects an invalid address", () => {
    expect(issuePaths(signUpSchema.safeParse({ ...validSignUp, email: "not-an-email" }))).toEqual([
      "email",
    ]);
  });
});

describe("names", () => {
  it("are trimmed", () => {
    expect(signUpSchema.parse({ ...validSignUp, firstName: "  Ada " }).firstName).toBe("Ada");
  });

  it("reject blank and too long values", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, firstName: "   " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignUp, lastName: "x".repeat(51) }).success).toBe(false);
  });
});

describe("password policy", () => {
  it("accepts 8 and 128 characters", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, password: "x".repeat(8) }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...validSignUp, password: "x".repeat(128) }).success).toBe(true);
  });

  it("rejects 7 and 129 characters", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, password: "x".repeat(7) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignUp, password: "x".repeat(129) }).success).toBe(false);
  });

  it("is not trimmed", () => {
    const parsed = signUpSchema.parse({ ...validSignUp, password: " spaced password " });

    expect(parsed.password).toBe(" spaced password ");
  });
});

describe("signUpFormSchema", () => {
  it("accepts matching passwords", () => {
    const result = signUpFormSchema.safeParse({ ...validSignUp, confirmPassword: "correct-horse" });

    expect(result.success).toBe(true);
  });

  it("rejects a mismatch on the confirmPassword field", () => {
    const result = signUpFormSchema.safeParse({ ...validSignUp, confirmPassword: "other-horse" });

    expect(issuePaths(result)).toEqual(["confirmPassword"]);
  });
});

describe("signUpSchema (API)", () => {
  it("rejects unknown fields", () => {
    expect(issuePaths(signUpSchema.safeParse({ ...validSignUp, status: "inactive" }))).toEqual([""]);
  });
});

describe("signInSchema", () => {
  it("does not apply the length policy", () => {
    expect(signInSchema.safeParse({ email: "ada@example.com", password: "short" }).success).toBe(
      true,
    );
  });

  it("requires a password", () => {
    expect(signInSchema.safeParse({ email: "ada@example.com", password: "" }).success).toBe(false);
  });
});

describe("changePasswordFormSchema", () => {
  it("rejects a mismatch", () => {
    const result = changePasswordFormSchema.safeParse({
      newPassword: "new-password",
      confirmPassword: "new-passw0rd",
    });

    expect(issuePaths(result)).toEqual(["confirmPassword"]);
  });
});

describe("createUserSchema", () => {
  it("defaults status to active", () => {
    expect(createUserSchema.parse(validSignUp).status).toBe("active");
  });

  it("rejects an unknown status", () => {
    expect(createUserSchema.safeParse({ ...validSignUp, status: "banned" }).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts a partial update", () => {
    expect(updateUserSchema.parse({ status: "inactive" })).toEqual({ status: "inactive" });
  });

  it.each([
    ["createdAt", { createdAt: "2020-01-01" }],
    ["email", { email: "other@example.com" }],
    ["an unknown field", { role: "admin" }],
  ])("rejects %s", (_label, body) => {
    expect(updateUserSchema.safeParse({ firstName: "Ada", ...body }).success).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it("applies the password policy", () => {
    expect(updateUserSchema.safeParse({ password: "short" }).success).toBe(false);
  });
});

describe("listUsersQuerySchema", () => {
  it("applies defaults when the query is empty", () => {
    expect(listUsersQuerySchema.parse({})).toEqual({ page: 1, pageSize: 6 });
  });

  it("coerces query-string values", () => {
    expect(listUsersQuerySchema.parse({ page: "3", pageSize: "12" })).toEqual({
      page: 3,
      pageSize: 12,
    });
  });

  it.each(["7", "0", "100", "abc"])("rejects pageSize %s", (pageSize) => {
    expect(listUsersQuerySchema.safeParse({ pageSize }).success).toBe(false);
  });

  it.each(["0", "-1", "1.5", "abc", ""])("rejects page %j", (page) => {
    expect(listUsersQuerySchema.safeParse({ page }).success).toBe(false);
  });
});
