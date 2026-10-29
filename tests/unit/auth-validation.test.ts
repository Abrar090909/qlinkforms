import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { defaultWorkspaceName } from "@/server/workspaces";

describe("signupSchema", () => {
  const valid = {
    name: " Ahmed Khan ",
    email: " Ahmed@Example.COM ",
    password: "longenough",
  };

  it("trims the name and normalises the email", () => {
    expect(signupSchema.parse(valid)).toEqual({
      name: "Ahmed Khan",
      email: "ahmed@example.com",
      password: "longenough",
    });
  });

  it("rejects short passwords, bad emails and blank names", () => {
    expect(
      signupSchema.safeParse({ ...valid, password: "short" }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
    expect(signupSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects missing fields (FormData.get returns null)", () => {
    expect(
      signupSchema.safeParse({ name: null, email: null, password: null })
        .success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});

describe("defaultWorkspaceName", () => {
  it("uses the first name when there is one", () => {
    expect(defaultWorkspaceName({ name: "Ahmed Khan" })).toBe(
      "Ahmed's workspace",
    );
    expect(defaultWorkspaceName({ name: "  " })).toBe("My workspace");
    expect(defaultWorkspaceName({ name: null })).toBe("My workspace");
  });
});
