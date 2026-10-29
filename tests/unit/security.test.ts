import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { contrastRatio, readableTextOn, themeStyle } from "@/lib/color";
import { buildTemplate, TEMPLATES } from "@/lib/forms/templates";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/server/payments/razorpay";
import { decryptSecret, encryptSecret } from "@/server/secrets";

const key = randomBytes(32).toString("base64");

describe("secret encryption", () => {
  it("round-trips and never stores the plaintext", () => {
    const stored = encryptSecret("rzp_secret_value", key);
    expect(stored).toMatch(/^v1\./);
    expect(stored).not.toContain("rzp_secret_value");
    expect(decryptSecret(stored, key)).toBe("rzp_secret_value");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("detects tampering and wrong keys", () => {
    const stored = encryptSecret("secret", key);
    const parts = stored.split(".");
    const flipped = Buffer.from(parts[3]!, "base64url");
    flipped[0] = flipped[0]! ^ 1;
    expect(() =>
      decryptSecret(
        [...parts.slice(0, 3), flipped.toString("base64url")].join("."),
        key,
      ),
    ).toThrow();
    expect(() =>
      decryptSecret(stored, randomBytes(32).toString("base64")),
    ).toThrow();
  });
});

describe("razorpay signatures", () => {
  it("accepts the checkout signature Razorpay computes and rejects others", () => {
    const signature = createHmac("sha256", "key_secret")
      .update("order_1|pay_1")
      .digest("hex");
    expect(
      verifyPaymentSignature(
        { orderId: "order_1", paymentId: "pay_1", signature },
        "key_secret",
      ),
    ).toBe(true);
    expect(
      verifyPaymentSignature(
        { orderId: "order_1", paymentId: "pay_2", signature },
        "key_secret",
      ),
    ).toBe(false);
    expect(
      verifyPaymentSignature(
        { orderId: "order_1", paymentId: "pay_1", signature: "short" },
        "key_secret",
      ),
    ).toBe(false);
  });

  it("checks webhook bodies byte for byte", () => {
    const body = '{"event":"payment.captured"}';
    const sig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "wh")).toBe(true);
    expect(verifyWebhookSignature(`${body} `, sig, "wh")).toBe(false);
  });
});

describe("csv export", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
    expect(csvCell("+91 98765")).toBe("'+91 98765");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("plain")).toBe("plain");
  });

  it("quotes commas, quotes and newlines, and starts with a BOM", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(toCsv([["x", "y"]])).toBe("﻿x,y\r\n");
  });
});

describe("theme colours", () => {
  it("picks readable button text for any accent", () => {
    expect(readableTextOn("#de7d4d")).toBe("#1b1b1b");
    expect(readableTextOn("#1e3a8a")).toBe("#ffffff");
    expect(contrastRatio("#ffffff", "#1b1b1b")).toBeGreaterThan(17);
  });

  it("falls back to text colour for focus rings on low-contrast accents", () => {
    expect(themeStyle("paper", "#fbbd58")["--color-focus"]).toBe("#18181b");
    expect(themeStyle("midnight", "#de7d4d")["--color-focus"]).toBe("#de7d4d");
  });
});

describe("templates", () => {
  it("has 10 templates that all build valid, publishable schemas", () => {
    expect(TEMPLATES).toHaveLength(10);
    for (const t of TEMPLATES) {
      const schema = buildTemplate(t.id);
      expect(schema, t.id).not.toBeNull();
      expect(schema!.blocks.length, t.id).toBeGreaterThan(0);
    }
  });

  it("gives every built form fresh ids", () => {
    const a = buildTemplate("event-tickets")!;
    const b = buildTemplate("event-tickets")!;
    expect(a.blocks[0]!.id).not.toBe(b.blocks[0]!.id);
  });
});
