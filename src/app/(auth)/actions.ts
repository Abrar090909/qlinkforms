"use server";

import { redirect } from "next/navigation";
import { toSessionUser } from "@/lib/auth";
import { clientEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { ensureUserSetup } from "@/server/workspaces";

export type AuthFormState = { error?: string; message?: string } | undefined;

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL;

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error: "Confirm your email first. Check your inbox for the link.",
      };
    }
    return { error: "Wrong email or password." };
  }

  await ensureUserSetup(toSessionUser(data.user));
  redirect(safeNextPath(formData.get("next")));
}

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, email, password } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: { full_name: name },
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return {
        error: "Pick a stronger password: longer, and not a common one.",
      };
    }
    if (error.code === "over_email_send_rate_limit") {
      return {
        error: "Too many sign-up emails just now. Try again in a few minutes.",
      };
    }
    return { error: "Couldn't create your account. Try again." };
  }

  // Email confirmation turned off in Supabase: the user is signed in already.
  if (data.session && data.user) {
    await ensureUserSetup(toSessionUser(data.user));
    redirect("/dashboard");
  }
  // Supabase gives the same answer whether or not the email is already
  // registered, so this doesn't reveal who has an account.
  return { message: `Check ${email} for a link to confirm your account.` };
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
