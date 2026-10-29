import { describe, expect, it } from "vitest";
import { parseEnv, resolveSiteUrl, serverEnvSchema } from "@/lib/env";

const valid = {
  SITE_URL: "http://localhost:3000",
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
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
      /SITE_URL[\s\S]*SUPABASE_URL[\s\S]*DATABASE_URL[\s\S]*DIRECT_URL/,
    );
  });

  it("treats empty strings as missing", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...valid, SUPABASE_URL: "" }),
    ).toThrowError(/SUPABASE_URL/);
  });

  it("rejects malformed URLs", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...valid, SITE_URL: "localhost" }),
    ).toThrowError(/SITE_URL/);
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

  it("drops unknown variables", () => {
    const env = parseEnv(serverEnvSchema, { ...valid, PATH: "/usr/bin" });
    expect(env).not.toHaveProperty("PATH");
  });
});

describe("resolveSiteUrl", () => {
  const vercel = {
    VERCEL_PROJECT_PRODUCTION_URL: "qlinkforms.vercel.app",
    VERCEL_BRANCH_URL: "qlinkforms-git-feat-x-team.vercel.app",
  };

  it("prefers an explicit SITE_URL", () => {
    expect(
      resolveSiteUrl({
        ...vercel,
        VERCEL_ENV: "production",
        SITE_URL: "https://a.in",
      }),
    ).toBe("https://a.in");
  });

  it("uses the production domain in production", () => {
    expect(resolveSiteUrl({ ...vercel, VERCEL_ENV: "production" })).toBe(
      "https://qlinkforms.vercel.app",
    );
  });

  it("uses the branch URL on a preview", () => {
    expect(resolveSiteUrl({ ...vercel, VERCEL_ENV: "preview" })).toBe(
      "https://qlinkforms-git-feat-x-team.vercel.app",
    );
  });

  it("never guesses outside Vercel", () => {
    expect(resolveSiteUrl(vercel)).toBeUndefined();
    expect(resolveSiteUrl({})).toBeUndefined();
  });
});
