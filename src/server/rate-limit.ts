import { db } from "@/lib/db";

// Fixed-window rate limiter in Postgres (no extra service). One atomic upsert
// per check, so concurrent requests can't both slip under the limit.

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const rows = await db.$queryRaw<{ count: number }[]>`
    insert into public.rate_limits as r (key, window_start, count)
    values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when r.window_start < now() - make_interval(secs => ${windowSeconds}::integer) then 1 else r.count + 1 end,
      window_start = case when r.window_start < now() - make_interval(secs => ${windowSeconds}::integer) then now() else r.window_start end
    returning count`;
  const count = rows[0]?.count ?? 0;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

/** Best-effort client IP from Vercel's headers. */
export function clientIp(headers: Headers) {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
