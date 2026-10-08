import { expect, signInViaUi, test, uniqueEmail } from "./fixtures";

async function fillSignUp(
  page: import("@playwright/test").Page,
  values: { email: string; password: string; confirm: string },
): Promise<void> {
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Email").fill(values.email);
  // MUI appends " *" to required labels; the anchor keeps "Confirm password" out.
  await page.getByLabel(/^Password/).fill(values.password);
  await page.getByLabel("Confirm password").fill(values.confirm);
}

test.describe("navigation without a session", () => {
  test("the root URL shows sign-up by default", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  });

  test("sign-up and sign-in link to each other", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("the dashboard redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe("sign-up", () => {
  test("a password mismatch is reported without calling the server", async ({ page }) => {
    await page.goto("/sign-up");
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") {
        posts.push(request.url());
      }
    });

    await fillSignUp(page, { email: uniqueEmail(), password: "correct-horse", confirm: "other-horse" });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
    expect(posts).toEqual([]);
  });

  test("a new account lands on the dashboard with a greeting", async ({ page }) => {
    await page.goto("/sign-up");

    await fillSignUp(page, { email: uniqueEmail(), password: "correct-horse", confirm: "correct-horse" });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Hello, Ada" })).toBeVisible();
  });

  test("an email that is already registered is reported on the field", async ({ page, api }) => {
    const existing = await api.signUp();
    await page.goto("/sign-up");

    await fillSignUp(page, { email: existing.email, password: "correct-horse", confirm: "correct-horse" });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Email is already registered")).toBeVisible();
    // Non-secret values survive the failed submit.
    await expect(page.getByLabel("First name")).toHaveValue("Ada");
  });
});

test.describe("sign-in", () => {
  test("valid credentials land on the dashboard", async ({ page, api }) => {
    const account = await api.signUp("Grace");

    await signInViaUi(page, account.email, account.password);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Hello, Grace" })).toBeVisible();
  });

  test("a wrong password shows a generic error", async ({ page, api }) => {
    const account = await api.signUp();

    await signInViaUi(page, account.email, "wrong-password");

    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("an inactive user cannot sign in", async ({ page, api }) => {
    const admin = await api.signUp();
    const inactive = await api.createUser(admin.sessionId, { status: "inactive" });

    await signInViaUi(page, inactive.email, "temporary-pass");

    await expect(page.getByRole("alert").filter({ hasText: "Your account is inactive" })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe("signed-in navigation", () => {
  test("signed-in users are sent from /, /sign-in and /sign-up to the dashboard", async ({ page, api }) => {
    const account = await api.signUp();
    await signInViaUi(page, account.email, account.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    for (const path of ["/", "/sign-in", "/sign-up"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test("log out terminates the session and shows sign-in", async ({ page, api }) => {
    const account = await api.signUp();
    await signInViaUi(page, account.email, account.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Log out" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    expect((await page.context().cookies()).some((cookie) => cookie.name === "sid")).toBe(false);
    // Going back must not reveal the dashboard.
    await page.goBack();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("a session ended elsewhere sends the user to sign-in with a notice", async ({ page, api }) => {
    const account = await api.signUp();
    await signInViaUi(page, account.email, account.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    const sid = (await page.context().cookies()).find((cookie) => cookie.name === "sid")?.value;

    await api.terminateSession(sid!);
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in\?expired=1$/);
    await expect(page.getByText("Your session has ended")).toBeVisible();

    // Signing in again replaces the stale cookie.
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
