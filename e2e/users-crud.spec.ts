import type { Page } from "@playwright/test";
import {
  expect,
  signInViaUi,
  test,
  uniqueEmail,
  type ApiHelper,
  type TestAccount,
} from "./fixtures";

// Other tests create users in parallel, so rows are found by their unique email, never by position.
// The largest page size keeps freshly created users on the first page.
const DASHBOARD = "/dashboard?page=1&pageSize=24";

/** Waits for the sign-in redirect before navigating, so the Server Action is not interrupted. */
async function openDashboardAs(page: Page, account: TestAccount): Promise<void> {
  await signInViaUi(page, account.email, account.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(DASHBOARD);
}

async function signInAsAdmin(page: Page, api: ApiHelper): Promise<TestAccount> {
  const admin = await api.signUp("Admin");
  await openDashboardAs(page, admin);
  return admin;
}

const rowFor = (page: Page, email: string) => page.getByRole("row").filter({ hasText: email });
const dialog = (page: Page) => page.getByRole("dialog");

async function openEdit(page: Page, email: string): Promise<void> {
  await rowFor(page, email).getByRole("button", { name: "Edit" }).click();
  await expect(dialog(page)).toBeVisible();
}

test.describe("create user", () => {
  test("creates a user that appears in the table", async ({ page, api }) => {
    await signInAsAdmin(page, api);
    const email = uniqueEmail("created");

    await page.getByRole("button", { name: "Create user" }).click();
    await dialog(page).getByLabel(/^First name/).fill("Grace");
    await dialog(page).getByLabel(/^Last name/).fill("Hopper");
    await dialog(page).getByLabel(/^Email/).fill(email);
    await dialog(page).getByLabel(/^Temporary password/).fill("temporary-pass");
    await dialog(page).getByRole("button", { name: "Create" }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(rowFor(page, email)).toContainText("Grace Hopper");
    await expect(rowFor(page, email)).toContainText("Active");
  });

  test("keeps the dialog open and reports a taken email", async ({ page, api }) => {
    const admin = await signInAsAdmin(page, api);

    await page.getByRole("button", { name: "Create user" }).click();
    await dialog(page).getByLabel(/^First name/).fill("Grace");
    await dialog(page).getByLabel(/^Last name/).fill("Hopper");
    await dialog(page).getByLabel(/^Email/).fill(admin.email);
    await dialog(page).getByLabel(/^Temporary password/).fill("temporary-pass");
    await dialog(page).getByRole("button", { name: "Create" }).click();

    await expect(dialog(page).getByText("Email is already registered")).toBeVisible();
    await expect(dialog(page).getByLabel(/^First name/)).toHaveValue("Grace");
  });
});

test.describe("edit user", () => {
  test("renames an active user", async ({ page, api }) => {
    const admin = await api.signUp("Admin");
    const user = await api.createUser(admin.sessionId);
    await openDashboardAs(page, admin);

    await openEdit(page, user.email);
    await expect(dialog(page).getByLabel(/^Email/)).toHaveAttribute("readonly", "");
    await dialog(page).getByLabel(/^First name/).fill("Augusta");
    await dialog(page).getByRole("button", { name: "Save" }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(rowFor(page, user.email)).toContainText("Augusta Hopper");
  });

  test("deactivates a user, after which the name can no longer be changed", async ({ page, api }) => {
    const admin = await api.signUp("Admin");
    const user = await api.createUser(admin.sessionId);
    await openDashboardAs(page, admin);

    await openEdit(page, user.email);
    await dialog(page).getByLabel("Status").selectOption("inactive");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(rowFor(page, user.email)).toContainText("Inactive");

    await openEdit(page, user.email);
    await expect(dialog(page).getByLabel(/^First name/)).toBeDisabled();
    await expect(dialog(page).getByText("Activate the user first")).toBeVisible();
  });

  test("the API also rejects renaming an inactive user (422)", async ({ api, request }) => {
    const admin = await api.signUp("Admin");
    const user = await api.createUser(admin.sessionId, { status: "inactive" });

    const response = await request.patch(`/api/users/${user.id}`, {
      headers: { authorization: `Bearer ${admin.sessionId}` },
      data: { status: "active", firstName: "Renamed" },
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe("USER_INACTIVE_RENAME");
  });

  test("your own row has no delete button and your status is locked", async ({ page, api }) => {
    const admin = await signInAsAdmin(page, api);

    await expect(rowFor(page, admin.email).getByRole("button", { name: "Delete" })).toHaveCount(0);
    await openEdit(page, admin.email);
    await expect(dialog(page).getByLabel("Status")).toBeDisabled();
  });
});

test.describe("delete user", () => {
  test("asks for confirmation; cancel keeps the user, delete removes it", async ({ page, api }) => {
    const admin = await api.signUp("Admin");
    const user = await api.createUser(admin.sessionId);
    await openDashboardAs(page, admin);

    await rowFor(page, user.email).getByRole("button", { name: "Delete" }).click();
    await dialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(rowFor(page, user.email)).toBeVisible();

    await rowFor(page, user.email).getByRole("button", { name: "Delete" }).click();
    await expect(dialog(page)).toContainText(user.email);
    await dialog(page).getByRole("button", { name: "Delete" }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(rowFor(page, user.email)).toHaveCount(0);
  });
});

test.describe("effects on the affected user's session", () => {
  test("a deactivated user who is signed in elsewhere is signed out", async ({ page, api, browser }) => {
    const admin = await api.signUp("Admin");
    const other = await api.signUp("Other");
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await signInViaUi(otherPage, other.email, other.password);
    await expect(otherPage).toHaveURL(/\/dashboard$/);

    await openDashboardAs(page, admin);
    await openEdit(page, other.email);
    await dialog(page).getByLabel("Status").selectOption("inactive");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(rowFor(page, other.email)).toContainText("Inactive");

    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/sign-in\?expired=1$/);
    await otherContext.close();
  });

  test("a password reset by an admin forces that user to choose a new one", async ({ page, api, browser }) => {
    const admin = await api.signUp("Admin");
    const other = await api.signUp("Other");

    await openDashboardAs(page, admin);
    await openEdit(page, other.email);
    await dialog(page).getByLabel(/^New password/).fill("reset-by-admin");
    await dialog(page).getByRole("button", { name: "Save" }).click();
    await expect(dialog(page)).toBeHidden();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await signInViaUi(otherPage, other.email, "reset-by-admin");
    await expect(otherPage).toHaveURL(/\/change-password$/);
    await otherContext.close();
  });
});
