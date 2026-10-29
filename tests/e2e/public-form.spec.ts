import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";

// The public form, as a respondent sees it. Seeds a published free form
// straight into the database (no login needed), then cleans it up.
// Needs DIRECT_URL (from .env.local); skipped against a deployed URL.

const url = process.env.DIRECT_URL;
test.skip(
  !url || Boolean(process.env.E2E_BASE_URL),
  "needs a local database connection",
);
test.describe.configure({ mode: "serial" });

const ids = {
  user: randomUUID(),
  workspace: randomUUID(),
  form: randomUUID(),
  version: randomUUID(),
};
const slug = `e2e-${ids.form.slice(0, 8)}`;

const schema = {
  version: 1,
  title: "Fest RSVP",
  description: "Tell us if you are coming.",
  blocks: [
    {
      id: "name1",
      type: "short_text",
      label: "Your name",
      required: true,
      visibility: null,
      maxLength: 200,
    },
    {
      id: "come1",
      type: "single_choice",
      label: "Will you attend?",
      required: true,
      visibility: null,
      options: [
        { id: "yes1", label: "Yes" },
        { id: "no11", label: "No" },
      ],
    },
    {
      id: "meal1",
      type: "multi_choice",
      label: "Meal preference",
      required: true,
      visibility: { fieldId: "come1", op: "equals", value: "yes1" },
      options: [
        { id: "veg1", label: "Veg" },
        { id: "jain", label: "Jain" },
      ],
    },
    {
      id: "mail1",
      type: "email",
      label: "Email",
      required: false,
      visibility: null,
    },
  ],
  settings: {
    theme: { preset: "midnight", accent: null },
    submitLabel: "",
    thankYouTitle: "See you there!",
    thankYouMessage: "Your RSVP is saved.",
    closed: false,
    closedMessage: "Closed.",
  },
};

async function withDb<T>(fn: (db: Client) => Promise<T>) {
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

test.beforeAll(async () => {
  await withDb(async (db) => {
    await db.query(`insert into profiles (id, email) values ($1, $2)`, [
      ids.user,
      `${slug}@example.test`,
    ]);
    await db.query(
      `insert into workspaces (id, owner_id, name) values ($1, $2, 'E2E')`,
      [ids.workspace, ids.user],
    );
    await db.query(
      `insert into forms (id, workspace_id, slug, title, status, published_at) values ($1, $2, $3, $4, 'published', now())`,
      [ids.form, ids.workspace, slug, schema.title],
    );
    await db.query(
      `insert into form_versions (id, form_id, schema_json) values ($1, $2, $3)`,
      [ids.version, ids.form, JSON.stringify(schema)],
    );
    await db.query(`update forms set current_version_id = $1 where id = $2`, [
      ids.version,
      ids.form,
    ]);
  });
});

test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query(`delete from submissions where form_id = $1`, [ids.form]);
    await db.query(`update forms set current_version_id = null where id = $1`, [
      ids.form,
    ]);
    await db.query(`delete from form_versions where form_id = $1`, [ids.form]);
    await db.query(`delete from workspaces where id = $1`, [ids.workspace]);
    await db.query(`delete from profiles where id = $1`, [ids.user]);
  });
});

test("validates, reveals conditional questions and records the response", async ({
  page,
}) => {
  await page.goto(`/f/${slug}`);
  await expect(page.getByRole("heading", { name: "Fest RSVP" })).toBeVisible();

  // Required errors are announced, and focus moves to the first problem.
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("2 answers need attention.")).toBeVisible();
  await expect(page.getByLabel(/Your name/)).toBeFocused();

  await page.getByLabel(/Your name/).fill("Meera");
  await expect(page.getByText("Meal preference")).toBeHidden();
  await page.getByText("Yes", { exact: true }).click();
  await expect(page.getByText("Meal preference")).toBeVisible();
  await page.getByText("Jain", { exact: true }).click();
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await page.getByLabel("Email").fill("meera@example.test");
  await page.getByRole("button", { name: "Submit" }).click();

  // The first submit compiles the receipt page on the dev server; allow for it.
  await expect(page).toHaveURL(new RegExp(`/f/${slug}/done\\?s=`), {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "See you there!" }),
  ).toBeVisible();
  await expect(page.getByText(/Receipt number/)).toBeVisible();
});

test("stores exactly the cleaned answers", async () => {
  const rows = await withDb(
    async (db) =>
      (
        await db.query(
          `select status, answers_json from submissions where form_id = $1`,
          [ids.form],
        )
      ).rows,
  );
  // One per project (mobile and desktop each submit once).
  expect(rows.length).toBeGreaterThanOrEqual(1);
  expect(rows[0].status).toBe("completed");
  expect(rows[0].answers_json).toEqual({
    name1: "Meera",
    come1: "yes1",
    meal1: ["jain"],
    mail1: "meera@example.test",
  });
});

// Streamed pages send 200 before notFound() runs; Next marks them noindex
// instead (a "soft 404"). Check the page and the tag, not the status.
test("unknown forms show the not-found page, marked noindex", async ({
  page,
}) => {
  await page.goto("/f/does-not-exist-123");
  await expect(
    page.getByRole("heading", { name: /doesn.t exist/ }),
  ).toBeVisible();
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]').first(),
  ).toBeAttached();
});
