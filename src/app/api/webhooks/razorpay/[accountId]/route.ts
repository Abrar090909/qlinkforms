import { z } from "zod";
import { verifyWebhookSignature } from "@/server/payments/razorpay";
import { handleRazorpayWebhook } from "@/server/submissions";

// Razorpay webhook endpoint, one URL per connected account so we know which
// webhook secret to verify with. Owners paste this URL into Razorpay.
// Respond 2xx quickly for anything we've safely handled or don't need, so
// Razorpay doesn't retry forever; 4xx only for bad signatures.

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/webhooks/razorpay/[accountId]">,
) {
  const { accountId } = await params;
  if (!z.uuid().safeParse(accountId).success)
    return new Response("not found", { status: 404 });
  // Read the raw body: the signature is over the exact bytes Razorpay sent.
  const rawBody = await request.text();
  if (rawBody.length > 512_000)
    return new Response("too large", { status: 413 });
  try {
    const outcome = await handleRazorpayWebhook({
      accountId,
      rawBody,
      signature: request.headers.get("x-razorpay-signature"),
      eventId: request.headers.get("x-razorpay-event-id"),
      verify: verifyWebhookSignature,
    });
    if (outcome === "bad_signature")
      return new Response("invalid signature", { status: 401 });
    if (outcome === "unknown_account")
      return new Response("not found", { status: 404 });
    return Response.json({ ok: true, outcome });
  } catch (error) {
    console.error("razorpay webhook failed", {
      accountId,
      message: error instanceof Error ? error.message : String(error),
    });
    // 500 makes Razorpay retry later, which is what we want for transient errors.
    return new Response("error", { status: 500 });
  }
}
