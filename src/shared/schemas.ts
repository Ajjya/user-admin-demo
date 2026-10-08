import { z } from "zod";
import { USER_STATUSES, normalizeEmail } from "@/domain/user";

// Shared by Route Handlers, Server Actions and client forms, so every entry point applies the
// same rules. Client checks are only for UX; the server always parses with these schemas again.

export const PAGE_SIZES = [6, 12, 24] as const;
export const DEFAULT_PAGE_SIZE = 6;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(50, "Must be at most 50 characters");

const email = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.email("Enter a valid email address"));

// Passwords are never trimmed: spaces are valid characters.
const password = z
  .string()
  .min(PASSWORD_MIN, `Must be at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Must be at most ${PASSWORD_MAX} characters`);

const status = z.enum(USER_STATUSES);

const passwordsMatch = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

export const signUpSchema = z.strictObject({
  firstName: name,
  lastName: name,
  email,
  password,
});

export const signUpFormSchema = signUpSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, passwordsMatch);

export const signInSchema = z.strictObject({
  email,
  // No length policy on sign-in: the stored hash decides, and errors stay generic.
  password: z.string().min(1, "Required").max(PASSWORD_MAX),
});

export const changePasswordSchema = z.strictObject({
  newPassword: password,
});

export const changePasswordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, passwordsMatch);

export const createUserSchema = z.strictObject({
  firstName: name,
  lastName: name,
  email,
  password,
  status: status.default("active"),
});

// Strict: unknown fields such as createdAt or email are rejected instead of silently dropped.
export const updateUserSchema = z
  .strictObject({
    firstName: name.optional(),
    lastName: name.optional(),
    status: status.optional(),
    password: password.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((size) => PAGE_SIZES.some((allowed) => allowed === size), {
      message: `Must be one of ${PAGE_SIZES.join(", ")}`,
    })
    .default(DEFAULT_PAGE_SIZE),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
