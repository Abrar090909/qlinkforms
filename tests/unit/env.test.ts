import { describe, expect, it } from "vitest";
import {
  clientEnvSchema,
  parseEnv,
  resolveSiteUrl,
  serverEnvSchema,
} from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
  DATABASE_URL: "postgresql://u:p@localhost:6543/postgres",
  DIRECT_URL: "postgresql://u:p@localhost:5432/postgres",
};

describe("parseEnv", () => {
  it("returns typed values when all vars are present", () => {
    const env = parseEnv(serverEnvSchema, valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
  });

  it("lists every missing variable in one error", () => {
    expect(() => parseEnv(serverEnvSchema, {})).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*DATABASE_URL[\s\S]*DIRECT_URL/,
    );
  });

  it("treats empty strings as missing", () => {
    expect(() =>
      parseEnv(clientEnvSchema, { ...valid, NEXT_PUBLIC_SUPABASE_URL: "" }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects malformed URLs", () => {
    expect(() =>
      parseEnv(clientEnvSchema, {
        ...valid,
        NEXT_PUBLIC_SITE_URL: "localhost",
      }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL/);
  });

  it("never includes values in the error message", () => {
    // Invalid on purpose so it appears in the error.
    const leaky = "SuperSecret123-not-a-url";
    expect(() =>
      parseEnv(serverEnvSchema, { ...valid, DATABASE_URL: leaky }),
    ).toThrowError(/DATABASE_URL/);
    try {
      parseEnv(serverEnvSchema, { ...valid, DATABASE_URL: leaky });
    } catch (error) {
      expect(String(error)).not.toContain("SuperSecret123");
    }
  });

  it("strips server-only vars from the client schema", () => {
    const env = parseEnv(clientEnvSchema, valid);
    expect(env).not.toHaveProperty("DATABASE_URL");
  });
});

describe("resolveSiteUrl", () => {
  const preview = {
    NEXT_PUBLIC_VERCEL_ENV: "preview",
    NEXT_PUBLIC_VERCEL_BRANCH_URL: "qlinkforms-git-feat-x-team.vercel.app",
  };

  it("prefers an explicit NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolveSiteUrl({ ...preview, NEXT_PUBLIC_SITE_URL: "https://a.in" }),
    ).toBe("https://a.in");
  });

  it("falls back to the branch URL on a Vercel preview", () => {
    expect(resolveSiteUrl(preview)).toBe(
      "https://qlinkforms-git-feat-x-team.vercel.app",
    );
  });

  it("never guesses outside previews", () => {
    expect(
      resolveSiteUrl({ ...preview, NEXT_PUBLIC_VERCEL_ENV: "production" }),
    ).toBeUndefined();
    expect(resolveSiteUrl({})).toBeUndefined();
  });
});
