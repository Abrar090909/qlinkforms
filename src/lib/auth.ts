import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Session helpers (the data access layer for "who is this?"). Always verify
// the user on the server before reading or changing their data; the proxy's
// redirect is only an optimistic check.

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function metadataName(user: UserLike): string | null {
  const meta = user.user_metadata ?? {};
  // full_name: our signup form and Google. name: some other providers.
  const name = meta.full_name ?? meta.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function toSessionUser(user: User): SessionUser {
  return { id: user.id, email: user.email ?? "", name: metadataName(user) };
}

/** The verified signed-in user, or null. Memoised per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Checking token expiry reads the clock, so this is always request-time work.
  // Without it, runtime prefetching hits Date.now() and errors.
  await connection();
  const supabase = await createSupabaseServerClient();
  // getClaims verifies the JWT signature; getSession alone would trust the cookie.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const { claims } = data;
  return {
    id: claims.sub,
    email: claims.email ?? "",
    name: metadataName(claims),
  };
});

/** The signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
