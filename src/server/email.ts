import { serverEnv } from "@/lib/env";

// Transactional email through Resend's HTTP API. Switched off (returns
// "skipped") until RESEND_API_KEY is set, so nothing breaks without it.

export type EmailResult = "sent" | "skipped" | "failed";

export function emailConfigured() {
  return Boolean(serverEnv.RESEND_API_KEY);
}

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape untrusted text (answers, form titles) before it goes into HTML. */
export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => escapeMap[c] ?? c);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const key = serverEnv.RESEND_API_KEY;
  if (!key) return "skipped";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.EMAIL_FROM,
        to: [input.to],
        subject: input.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("email send failed", response.status);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error(
      "email send failed",
      error instanceof Error ? error.message : error,
    );
    return "failed";
  }
}

/** Minimal dark-on-light email layout (email clients ignore most CSS). */
export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f3f6;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:#ffffff;border-radius:16px;padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(title)}</h1>
${bodyHtml}
</div>
<p style="font-size:12px;color:#655d67;text-align:center;margin-top:16px">Sent by UPI Forms</p>
</div></body></html>`;
}
