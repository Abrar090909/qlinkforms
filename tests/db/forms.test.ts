import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  createDraftForm,
  DEFAULT_FORM_TITLE,
  getFormForUser,
  listForms,
} from "@/server/forms";
import { ensureUserSetup } from "@/server/workspaces";

// Writes real rows through the app's own services, then deletes them.
const alice = { id: randomUUID(), email: "forms-a@example.test", name: "A" };
const bob = { id: randomUUID(), email: "forms-b@example.test", name: "B" };

beforeAll(async () => {
  await ensureUserSetup(alice);
  await ensureUserSetup(bob);
});

afterAll(async () => {
  const owners = [alice.id, bob.id];
  // Cascades to memberships, forms and audit_log.
  await db.workspace.deleteMany({ where: { ownerId: { in: owners } } });
  await db.profile.deleteMany({ where: { id: { in: owners } } });
  await db.$disconnect();
});

it("creates a draft form in the user's workspace and audits it", async () => {
  const form = await createDraftForm(alice);
  const stored = await db.form.findUniqueOrThrow({ where: { id: form.id } });
  const workspace = await db.membership.findFirstOrThrow({
    where: { userId: alice.id },
  });

  expect(stored).toEqual(
    expect.objectContaining({
      workspaceId: workspace.workspaceId,
      title: DEFAULT_FORM_TITLE,
      status: "draft",
      currentVersionId: null,
    }),
  );
  expect(stored.slug).toMatch(/^[a-z2-9]{10}$/);
  expect(
    await db.auditLog.count({
      where: { workspaceId: workspace.workspaceId, action: "form.created" },
    }),
  ).toBe(1);
});

it("lists and opens forms only for members of the form's workspace", async () => {
  const form = await createDraftForm(alice);

  expect((await listForms(alice)).map((f) => f.id)).toContain(form.id);
  expect((await listForms(bob)).map((f) => f.id)).not.toContain(form.id);

  expect(await getFormForUser(alice, form.id)).toEqual(
    expect.objectContaining({ id: form.id, status: "draft" }),
  );
  expect(await getFormForUser(bob, form.id)).toBeNull();
  expect(await getFormForUser(alice, randomUUID())).toBeNull();
});
