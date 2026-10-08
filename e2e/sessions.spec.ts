import { expect, signInViaUi, test } from "./fixtures";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

test.describe("your sessions", () => {
  test("lists the devices signed in to your account and revokes another one", async ({ page, api, browser }) => {
    const account = await api.signUp();
    // A second device: another browser context with an iPhone user agent.
    const phone = await browser.newContext({ userAgent: IPHONE_UA });
    const phonePage = await phone.newPage();
    await signInViaUi(phonePage, account.email, account.password);
    await expect(phonePage).toHaveURL(/\/dashboard$/);

    await signInViaUi(page, account.email, account.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("link", { name: "Sessions" }).click();
    await expect(page).toHaveURL(/\/sessions$/);

    const rows = page.locator("tbody tr");
    const phoneRow = rows.filter({ hasText: "Safari on iOS" });
    // The API sign-up session (no user agent), the phone, and this browser.
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: "This device" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "This device" }).getByRole("button", { name: "Revoke" })).toHaveCount(0);

    await phoneRow.getByRole("button", { name: "Revoke" }).click();

    await expect(phoneRow).toHaveCount(0);
    await expect(rows).toHaveCount(2);
    // The phone is signed out at its next request.
    await phonePage.reload();
    await expect(phonePage).toHaveURL(/\/sign-in\?expired=1$/);
    await phone.close();
  });

  test("is protected like the dashboard", async ({ page }) => {
    await page.goto("/sessions");

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
