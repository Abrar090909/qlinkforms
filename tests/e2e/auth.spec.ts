import { expect, test } from "@playwright/test";

test("signed-out visitors are sent from the dashboard to login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("login page offers email and Google sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("wrong password shows an error without leaving the page", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Log in" }).click();
  // Next.js renders its own empty role="alert" route announcer, so match by text.
  await expect(
    page.getByRole("alert").filter({ hasText: "Wrong email or password." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("signup page has the fields we need", async ({ page }) => {
  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("an invalid email link lands on login with a message", async ({
  page,
}) => {
  await page.goto("/auth/confirm?token_hash=bogus&type=email");
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "invalid or has expired" }),
  ).toBeVisible();
});
