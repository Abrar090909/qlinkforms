import { afterAll, expect, it } from "vitest";
import { db } from "@/lib/db";

// Smoke test: the app's Prisma client reaches the database through the
// transaction pooler (DATABASE_URL, port 6543).

afterAll(async () => {
  await db.$disconnect();
});

it("connects through the pooler and queries a model", async () => {
  const [row] = await db.$queryRaw<{ ok: number }[]>`select 1::int as ok`;
  expect(row?.ok).toBe(1);
  expect(await db.webhookEvent.count()).toBeGreaterThanOrEqual(0);
});
