import { describe, expect, it } from "vitest";
import { randomSlug, SLUG_ALPHABET, SLUG_LENGTH } from "@/lib/slug";

describe("randomSlug", () => {
  it("is URL-safe, the default length and avoids look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const slug = randomSlug();
      expect(slug).toHaveLength(SLUG_LENGTH);
      expect(slug).toMatch(/^[a-z2-9]+$/);
      expect(slug).not.toMatch(/[01ilo]/);
    }
  });

  it("only uses the alphabet", () => {
    const slug = randomSlug(500);
    for (const char of slug) expect(SLUG_ALPHABET).toContain(char);
  });

  it("doesn't repeat across many calls", () => {
    const slugs = new Set(Array.from({ length: 1000 }, () => randomSlug()));
    expect(slugs.size).toBe(1000);
  });
});
