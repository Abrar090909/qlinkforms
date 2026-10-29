import { describe, expect, it } from "vitest";
import { isAuthPage, isProtectedPath, safeNextPath } from "@/lib/routes";

describe("safeNextPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/forms/123?tab=settings#top", "/forms/123?tab=settings#top"],
    ["/forms/../dashboard", "/dashboard"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "dashboard",
    "",
    null,
    undefined,
    42,
  ])("falls back for %s", (input) => {
    expect(safeNextPath(input)).toBe("/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(safeNextPath("//x", "/login")).toBe("/login");
  });
});

describe("route rules", () => {
  it("protects app routes and their children only", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/forms/abc/edit")).toBe(true);
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/f/my-form")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("knows the auth pages", () => {
    expect(isAuthPage("/login")).toBe(true);
    expect(isAuthPage("/signup")).toBe(true);
    expect(isAuthPage("/auth/callback")).toBe(false);
  });
});
