import { z } from "zod";

// All variables are server-only. Nothing here is inlined into the browser
// bundle: Supabase is only called from server code (proxy, server actions,
// route handlers), so there is no NEXT_PUBLIC_* variable to manage. On Vercel
// every variable can be added as Sensitive in one batch.
export const serverEnvSchema = z.object({
  // The app's own URL, for auth redirect links. Optional on Vercel, where it
  // is derived from the deployment (see resolveSiteUrl).
  SITE_URL: z.url(),
  SUPABASE_URL: z.url(),
  // Publishable (formerly "anon") key. Safe to expose, but kept server-side.
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Pooled connection (Supabase pooler) used by the app at runtime.
  DATABASE_URL: z.url(),
  // Direct connection used by Prisma migrations.
  DIRECT_URL: z.url(),

  // Optional features. The app runs without them and says what's missing.
  // 32 random bytes, base64. Encrypts owners' Razorpay secrets at rest.
  // Without it, owners can't connect Razorpay. Generate: see README.
  PAYMENT_SECRETS_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, "base64").length === 32,
      "must be 32 bytes, base64",
    )
    .optional(),
  // Resend API key for receipts and owner notifications. Without it, no email.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).default("UPI Forms <onboarding@resend.dev>"),
  // Shared secret for the reconciliation cron (Vercel sends it as a Bearer token).
  CRON_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Parse env vars against a schema and throw one error listing every problem.
 * The message names variables only, never their values, so secrets are not logged.
 */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined>,
): z.infer<S> {
  // Treat empty strings ("KEY=" in a .env file) as missing.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new Error(
      `Invalid environment variables:\n${lines.join("\n")}\nSee .env.example.`,
    );
  }
  return result.data;
}

/**
 * SITE_URL if set. Otherwise, on Vercel, the production domain in production
 * and the stable branch URL on previews, so auth links always come back to the
 * deployment that sent them. VERCEL_* are Vercel system variables.
 */
export function resolveSiteUrl(source: Record<string, string | undefined>) {
  if (source.SITE_URL) return source.SITE_URL;
  const host =
    source.VERCEL_ENV === "production"
      ? source.VERCEL_PROJECT_PRODUCTION_URL
      : source.VERCEL_ENV === "preview"
        ? source.VERCEL_BRANCH_URL
        : undefined;
  return host ? `https://${host}` : undefined;
}

const isServer = typeof window === "undefined";

export const serverEnv: ServerEnv = isServer
  ? parseEnv(serverEnvSchema, {
      ...process.env,
      SITE_URL: resolveSiteUrl(process.env),
    })
  : new Proxy({} as ServerEnv, {
      get(_, key) {
        throw new Error(
          `serverEnv.${String(key)} was read in the browser. Server env vars are server-only.`,
        );
      },
    });
