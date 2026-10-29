import { randomInt } from "node:crypto";

// Lowercase letters and digits minus look-alikes (0/o, 1/l/i), so slugs read
// clearly in a shared link.
export const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const SLUG_LENGTH = 10;

/** A random public slug, for example "k7m2xq9fha". Server only. */
export function randomSlug(length = SLUG_LENGTH): string {
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  }
  return slug;
}
