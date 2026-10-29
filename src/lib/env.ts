import { z } from "zod";

// Variables safe to ship to the browser. Next.js inlines NEXT_PUBLIC_* at build time.
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Server-only variables. Never import these into client components.
export const serverEnvSchema = clientEnvSchema.extend({
  // Pooled connection (Supabase pooler) used by the app at runtime.
  DATABASE_URL: z.url(),
  // Direct connection used by Prisma migrations.
  DIRECT_URL: z.url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
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
 * NEXT_PUBLIC_SITE_URL, or on a Vercel preview without it, the preview's
 * stable branch URL, so auth links come back to the preview instead of
 * production. The NEXT_PUBLIC_VERCEL_* values are set by Vercel at build time.
 */
export function resolveSiteUrl(source: Record<string, string | undefined>) {
  if (source.NEXT_PUBLIC_SITE_URL) return source.NEXT_PUBLIC_SITE_URL;
  const branchUrl = source.NEXT_PUBLIC_VERCEL_BRANCH_URL;
  if (source.NEXT_PUBLIC_VERCEL_ENV === "preview" && branchUrl) {
    return `https://${branchUrl}`;
  }
  return undefined;
}

// Each NEXT_PUBLIC_* var must be referenced literally so Next.js can inline it.
const siteUrl = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
});

const isServer = typeof window === "undefined";

// Parsed first so a server boot reports every missing variable in one error.
export const serverEnv: ServerEnv = isServer
  ? parseEnv(serverEnvSchema, { ...process.env, NEXT_PUBLIC_SITE_URL: siteUrl })
  : new Proxy({} as ServerEnv, {
      get(_, key) {
        throw new Error(
          `serverEnv.${String(key)} was read in the browser. Server env vars are server-only.`,
        );
      },
    });

export const clientEnv: ClientEnv = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_SITE_URL: siteUrl,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
