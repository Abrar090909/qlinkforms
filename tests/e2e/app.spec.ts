import { expect, type Page, test } from "@playwright/test";

// Signed-in flow. Needs a confirmed Supabase user in E2E_EMAIL / E2E_PASSWORD
// (see README, "End-to-end tests"). Skipped when they're not set.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(!email || !password, "E2E_EMAIL and E2E_PASSWORD are not set");
// One account: run these one at a time so forms don't collide.
test.describe.configure({ mode: "serial" });

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("build, publish and fill in a form, then see the response", async ({
  page,
}) => {
  await logIn(page);
  await expect(
    page.getByRole("heading", { name: "Forms", level: 1 }),
  ).toBeVisible();

  // Empty dashboards show the template grid inline; otherwise open "New form".
  const blank = page.getByRole("button", { name: /Blank form/ });
  if (!(await blank.first().isVisible()))
    await page.getByRole("button", { name: "New form" }).click();
  await page
    .getByRole("button", { name: /Blank form/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/forms\/[0-9a-f-]{36}\/edit$/);

  const title = `E2E ${Date.now()}`;
  await page.getByLabel("Form title").fill(title);
  // Insert a short answer through the "/" menu, keyboard only.
  const slash = page.getByRole("combobox", { name: /Add a field/ });
  await slash.fill("/short");
  await slash.press("Enter");
  await page.getByLabel("Question").first().fill("Your name");
  await expect(page.getByText("All changes saved")).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible({
    timeout: 15_000,
  });
  const link = await page
    .getByRole("link", { name: "Open form ↗" })
    .getAttribute("href");
  expect(link).toMatch(/\/f\/[a-z0-9-]+$/);
  await page.getByRole("button", { name: "Done" }).click();

  // Respond as a visitor would.
  await page.goto(new URL(link!).pathname);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByLabel(/Your name/).fill("Playwright");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(/Receipt number/)).toBeVisible();

  // And it shows up for the owner.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.goto(page.url().replace(/\/edit$/, "/responses"));
  await expect(page.getByText("Playwright").first()).toBeVisible();
});

test("someone else's form id shows not found, and logout works", async ({
  page,
}) => {
  await logIn(page);
  // Streamed pages can't change status after the shell; check the not-found page.
  await page.goto("/forms/00000000-0000-4000-8000-000000000000/edit");
  await expect(
    page.getByRole("heading", { name: /doesn.t exist/ }),
  ).toBeVisible();
  await page.goto("/forms/not-a-uuid/edit");
  await expect(
    page.getByRole("heading", { name: /doesn.t exist/ }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
});
