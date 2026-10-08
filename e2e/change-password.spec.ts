import type { Page } from "@playwright/test";
import { expect, signInViaUi, test, type ApiHelper } from "./fixtures";

const TEMPORARY_PASSWORD = "temporary-pass";

/** An admin creates a user via the API; that user signs in through the UI with the temporary password. */
async function signInWithTemporaryPassword(page: Page, api: ApiHelper): Promise<string> {
  const admin = await api.signUp();
  const user = await api.createUser(admin.sessionId, { firstName: "Grace" });
  await signInViaUi(page, user.email, TEMPORARY_PASSWORD);
  await expect(page).toHaveURL(/\/change-password$/);
  return user.email;
}

async function fillNewPassword(page: Page, password: string, confirm: string): Promise<void> {
  await page.getByLabel(/^New password/).fill(password);
  await page.getByLabel(/^Confirm new password/).fill(confirm);
}

test.describe("forced password change", () => {
  test("a user with a temporary password is sent to the change-password page", async ({ page, api }) => {
    await signInWithTemporaryPassword(page, api);

    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await expect(page.getByText("Welcome, Grace")).toBeVisible();
  });

  test("other pages redirect back until the password is changed", async ({ page, api }) => {
    await signInWithTemporaryPassword(page, api);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/change-password$/);
  });

  test("a mismatch is reported without calling the server", async ({ page, api }) => {
    await signInWithTemporaryPassword(page, api);
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") {
        posts.push(request.url());
      }
    });

    await fillNewPassword(page, "my-own-password", "my-own-passw0rd");
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
    expect(posts).toEqual([]);
  });

  test("reusing the temporary password is rejected", async ({ page, api }) => {
    await signInWithTemporaryPassword(page, api);

    await fillNewPassword(page, TEMPORARY_PASSWORD, TEMPORARY_PASSWORD);
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page.getByText("The new password must differ from the temporary one")).toBeVisible();
    await expect(page).toHaveURL(/\/change-password$/);
  });

  test("a new password unlocks the dashboard and works for the next sign-in", async ({ page, api }) => {
    const email = await signInWithTemporaryPassword(page, api);

    await fillNewPassword(page, "my-own-password", "my-own-password");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Hello, Grace" })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await signInViaUi(page, email, "my-own-password");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("log out works from the change-password page", async ({ page, api }) => {
    await signInWithTemporaryPassword(page, api);

    await page.getByRole("button", { name: "Log out" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/change-password");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("a user without a temporary password is sent from the page to the dashboard", async ({ page, api }) => {
    const account = await api.signUp();
    await signInViaUi(page, account.email, account.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/change-password");

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
