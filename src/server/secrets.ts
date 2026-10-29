import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";

// Encryption at rest for owners' payment secrets (CLAUDE.md rule 3).
// AES-256-GCM with a random 96-bit IV per value; the auth tag makes tampering
// detectable. Stored as "v1.<iv>.<tag>.<ciphertext>", each part base64url.
// Plaintext secrets never leave the server and are never logged.

const VERSION = "v1";

export class SecretsUnavailableError extends Error {
  constructor() {
    super("PAYMENT_SECRETS_KEY is not configured");
  }
}

function key(raw = serverEnv.PAYMENT_SECRETS_KEY): Buffer {
  if (!raw) throw new SecretsUnavailableError();
  return Buffer.from(raw, "base64");
}

export function secretsConfigured() {
  return Boolean(serverEnv.PAYMENT_SECRETS_KEY);
}

export function encryptSecret(plaintext: string, rawKey?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(rawKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function decryptSecret(stored: string, rawKey?: string): string {
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Unrecognised secret format");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(rawKey),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
