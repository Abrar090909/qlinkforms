import { type NextRequest, NextResponse } from "next/server";
import { toSessionUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserSetup } from "@/server/workspaces";

// OAuth (Google) lands here with ?code=... after the provider signs the user in.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await ensureUserSetup(toSessionUser(data.user));
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
