import { expect, test, type Page } from "@playwright/test";

const html = (page: Page) => page.locator("html");

test.describe("theme selector", () => {
  test("applies the chosen theme immediately", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(html(page)).toHaveClass(/\blight\b/);
  });

  test("persists after a reload and in a new page", async ({ page, context }) => {
    // The OS prefers light, so "dark" can only come from the stored choice.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Same browser profile (localStorage), new tab: like closing and reopening the app.
    const newPage = await context.newPage();
    await newPage.emulateMedia({ colorScheme: "light" });
    await newPage.goto("/");
    await expect(html(newPage)).toHaveClass(/\bdark\b/);
  });

  test("sets the stored theme before the app hydrates (no flash)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Dark theme" }).click();

    // Inspect the DOM as soon as HTML parsing finishes, before React runs.
    await page.reload({ waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.className)).toMatch(/\bdark\b/);
  });

  test("System follows the operating system preference", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "System theme" }).click();

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html(page)).toHaveClass(/\blight\b/);
  });
});
