import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { reconcilePendingPayments } from "@/server/submissions";

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
// Settles payments whose callback and webhook were both lost.

function authorised(header: string | null) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) {
    return new Response("unauthorised", { status: 401 });
  }
  const summary = await reconcilePendingPayments({ limit: 100 });
  console.info("reconcile", summary);
  return Response.json(summary);
}
