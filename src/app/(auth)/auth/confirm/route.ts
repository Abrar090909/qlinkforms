import { type NextRequest, NextResponse } from "next/server";
import { toSessionUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emailOtpTypeSchema } from "@/lib/validation/auth";
import { ensureUserSetup } from "@/server/workspaces";

// Email confirmation links land here with ?token_hash=...&type=email.
// Unlike a PKCE ?code=, a token hash works when the link is opened on a
// different device or browser from the one used to sign up.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = emailOtpTypeSchema.safeParse(searchParams.get("type"));
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type.success) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type: type.data,
      token_hash: tokenHash,
    });
    if (!error && data.user) {
      await ensureUserSetup(toSessionUser(data.user));
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
