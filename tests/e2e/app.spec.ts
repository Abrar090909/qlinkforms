import { expect, test } from "@playwright/test";

// Signed-in flow. Needs a confirmed Supabase user in E2E_EMAIL / E2E_PASSWORD
// (see README, "End-to-end tests"). Skipped when they're not set.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, "E2E_EMAIL and E2E_PASSWORD are not set");

test("log in, create a draft form, open it, log out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Forms" })).toBeVisible();
  await expect(page.getByText(/workspace/i).first()).toBeVisible();

  // Either the empty state's button or the header button: both say "New form".
  await page.getByRole("button", { name: "New form" }).first().click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]{36}\/edit$/);
  await expect(
    page.getByRole("heading", { name: "Untitled form" }),
  ).toBeVisible();
  const editUrl = new URL(page.url()).pathname;

  await page.getByRole("link", { name: "All forms" }).click();
  await expect(page.locator(`a[href="${editUrl}"]`)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("someone else's form id shows not found", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const response = await page.goto(
    "/forms/00000000-0000-4000-8000-000000000000/edit",
  );
  expect(response?.status()).toBe(404);
  const bad = await page.goto("/forms/not-a-uuid/edit");
  expect(bad?.status()).toBe(404);
});
