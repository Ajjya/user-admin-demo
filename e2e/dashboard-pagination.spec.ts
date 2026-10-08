import type { Page } from "@playwright/test";
import { expect, signInViaUi, test, type ApiHelper } from "./fixtures";

// Runs in its own Playwright project after all other tests with a single worker (see
// playwright.config.ts), so nothing else inserts users while the global order is being asserted.

const rows = (page: Page) => page.locator("tbody tr");

/** Signs up an admin, creates `count` users (oldest first) and signs the admin in. */
async function seed(page: Page, api: ApiHelper, count: number): Promise<string[]> {
  const admin = await api.signUp();
  const emails: string[] = [];
  for (let i = 0; i < count; i += 1) {
    emails.push((await api.createUser(admin.sessionId)).email);
  }
  await signInViaUi(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  return emails;
}

test.describe("dashboard pagination", () => {
  test("shows 6 users per page, newest first, with the rest on the next page", async ({ page, api }) => {
    const emails = await seed(page, api, 7);
    const newestFirst = [...emails].reverse();

    await expect(rows(page)).toHaveCount(6);
    for (const [index, email] of newestFirst.slice(0, 6).entries()) {
      await expect(rows(page).nth(index)).toContainText(email);
    }

    await page.getByRole("link", { name: "Go to page 2", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\?page=2&pageSize=6$/);
    await expect(rows(page).first()).toContainText(newestFirst[6]);
  });

  test("keeps the page after a reload", async ({ page, api }) => {
    const emails = await seed(page, api, 7);

    await page.goto("/dashboard?page=2&pageSize=6");
    await page.reload();

    await expect(page.getByRole("link", { name: "page 2", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(rows(page).first()).toContainText(emails[0]);
  });

  test("changing the page size shows more rows and updates the URL", async ({ page, api }) => {
    await seed(page, api, 12);

    await page.getByLabel("Rows per page").selectOption("12");

    await expect(page).toHaveURL(/\/dashboard\?page=1&pageSize=12$/);
    await expect(rows(page)).toHaveCount(12);
  });

  test("a page past the end shows the last page", async ({ page, api }) => {
    await seed(page, api, 1);

    await page.goto("/dashboard?page=999&pageSize=6");

    // Scoped to the pagination control: the header navigation also marks its current page.
    const current = page.getByRole("navigation", { name: "pagination navigation" }).locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    const lastPage = Number(await current.textContent());
    expect(lastPage).toBeGreaterThan(1);
    await expect(page.getByRole("link", { name: `Go to page ${lastPage + 1}`, exact: true })).toHaveCount(0);
    await expect(rows(page)).not.toHaveCount(0);
  });

  test("an unsupported page size falls back to 6", async ({ page, api }) => {
    await seed(page, api, 7);

    await page.goto("/dashboard?pageSize=7");

    await expect(rows(page)).toHaveCount(6);
    await expect(page.getByLabel("Rows per page")).toHaveValue("6");
  });
});
