import "server-only";
import type { Clock } from "@/domain/clock";
import { createUser } from "@/domain/user";
import type { UserRepository } from "@/server/repositories/user-repository";
import type { PasswordHasher } from "@/server/security/password";

export const DEMO_ADMIN_EMAIL = "admin@example.com";

// Deterministic demo data: 20 users, two of them inactive, so pagination (6 per page) and the
// inactive-user rules are visible right away.
const DEMO_USERS: { firstName: string; lastName: string; inactive?: boolean }[] = [
  { firstName: "Ada", lastName: "Lovelace" },
  { firstName: "Grace", lastName: "Hopper" },
  { firstName: "Alan", lastName: "Turing" },
  { firstName: "Katherine", lastName: "Johnson" },
  { firstName: "Edsger", lastName: "Dijkstra", inactive: true },
  { firstName: "Barbara", lastName: "Liskov" },
  { firstName: "Donald", lastName: "Knuth" },
  { firstName: "Margaret", lastName: "Hamilton" },
  { firstName: "Tim", lastName: "Berners-Lee" },
  { firstName: "Radia", lastName: "Perlman" },
  { firstName: "Linus", lastName: "Torvalds" },
  { firstName: "Frances", lastName: "Allen", inactive: true },
  { firstName: "John", lastName: "McCarthy" },
  { firstName: "Hedy", lastName: "Lamarr" },
  { firstName: "Ken", lastName: "Thompson" },
  { firstName: "Shafi", lastName: "Goldwasser" },
  { firstName: "Dennis", lastName: "Ritchie" },
  { firstName: "Annie", lastName: "Easley" },
  { firstName: "Guido", lastName: "van Rossum" },
  { firstName: "Jean", lastName: "Bartik" },
];

export interface SeedDeps {
  users: UserRepository;
  hasher: PasswordHasher;
  clock: Clock;
  generateId: () => string;
}

/**
 * Creates the demo admin (a normal password) and the demo users (the same password as a temporary
 * one, so signing in as them shows the forced password change). Runs only on an empty database:
 * it never mixes demo data into real data and does nothing on later restarts.
 * Returns whether anything was created.
 */
export async function seedDemoData(deps: SeedDeps, password: string): Promise<boolean> {
  const alreadyUsed =
    (await deps.users.count()) > 0 || (await deps.users.findByEmail(DEMO_ADMIN_EMAIL)) !== null;
  if (alreadyUsed) {
    return false;
  }

  const passwordHash = await deps.hasher.hash(password);
  const now = deps.clock().getTime();
  const minutesAgo = (minutes: number): Date => new Date(now - minutes * 60_000);

  // Older users first, the admin last, so the list (newest first) starts with the admin.
  for (const [index, demo] of DEMO_USERS.entries()) {
    const email = `${demo.firstName}.${demo.lastName}`.toLowerCase().replaceAll(/[^a-z.]/g, "");
    await deps.users.insert(
      createUser(
        {
          id: deps.generateId(),
          firstName: demo.firstName,
          lastName: demo.lastName,
          email: `${email}@example.com`,
          passwordHash,
          status: demo.inactive ? "inactive" : "active",
          mustChangePassword: true,
        },
        minutesAgo(DEMO_USERS.length - index),
      ),
    );
  }
  await deps.users.insert(
    createUser(
      {
        id: deps.generateId(),
        firstName: "Demo",
        lastName: "Admin",
        email: DEMO_ADMIN_EMAIL,
        passwordHash,
        status: "active",
        mustChangePassword: false,
      },
      minutesAgo(0),
    ),
  );
  return true;
}
