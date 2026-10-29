import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ensureUserSetup, getCurrentWorkspace } from "@/server/workspaces";

// Writes real rows (Prisma can't share the RLS test's transaction), so it
// deletes them afterwards.
const user = {
  id: randomUUID(),
  email: "setup-test@example.test",
  name: "Test User",
};

afterAll(async () => {
  // Cascades to memberships and audit_log.
  await db.workspace.deleteMany({ where: { ownerId: user.id } });
  await db.profile.deleteMany({ where: { id: user.id } });
  await db.$disconnect();
});

it("first login creates profile, workspace and owner membership exactly once", async () => {
  // Two tabs finishing login at the same moment.
  const [first, second] = await Promise.all([
    ensureUserSetup(user),
    ensureUserSetup(user),
  ]);
  const third = await ensureUserSetup(user);

  expect(second.id).toBe(first.id);
  expect(third.id).toBe(first.id);
  expect(first.name).toBe("Test's workspace");

  const memberships = await db.membership.findMany({
    where: { userId: user.id },
  });
  expect(memberships).toEqual([
    expect.objectContaining({ workspaceId: first.id, role: "owner" }),
  ]);
  expect(await db.profile.findUnique({ where: { id: user.id } })).toEqual(
    expect.objectContaining({ email: user.email, name: user.name }),
  );
  expect(await db.auditLog.count({ where: { workspaceId: first.id } })).toBe(1);

  expect(await getCurrentWorkspace(user)).toEqual({
    id: first.id,
    name: first.name,
  });
});
