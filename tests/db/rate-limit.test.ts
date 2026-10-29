import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { db } from "@/lib/db";
import { rateLimit } from "@/server/rate-limit";

const key = `test:${randomUUID()}`;

afterAll(async () => {
  await db.rateLimit.deleteMany({ where: { key } });
  await db.$disconnect();
});

it("allows up to the limit, even under concurrent requests, then blocks", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, () => rateLimit(key, 5, 60)),
  );
  expect(results.filter((r) => r.allowed)).toHaveLength(5);
  expect((await rateLimit(key, 5, 60)).allowed).toBe(false);
});

it("starts a new window once the old one has passed", async () => {
  await db.rateLimit.update({
    where: { key },
    data: { windowStart: new Date(Date.now() - 120_000) },
  });
  expect(await rateLimit(key, 5, 60)).toEqual({ allowed: true, remaining: 4 });
});
