"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  FormRenderer,
  type SubmitFeedback,
} from "@/components/form/form-renderer";
import type { Answers } from "@/lib/forms/answers";
import type { FormSchema } from "@/lib/forms/schema";
import { confirmAction, couponAction, submitAction } from "./actions";

type Checkout = Extract<
  Awaited<ReturnType<typeof submitAction>>,
  { status: "pending_payment" }
>;

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (e: { error?: { description?: string } }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Load Razorpay Checkout only when someone actually pays. */
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout script failed"));
    document.head.appendChild(script);
  });
}

export function PublicForm({
  slug,
  versionId,
  schema,
}: {
  slug: string;
  versionId: string;
  schema: FormSchema;
}) {
  const router = useRouter();
  // Reuse an open order when the respondent closes Checkout and taps Pay again
  // with the same answers, so they can't create a second payable order.
  const pending = useRef<{ key: string; checkout: Checkout } | null>(null);
  const [honeypot, setHoneypot] = useState("");

  function openCheckout(result: Checkout): Promise<SubmitFeedback | void> {
    return new Promise((resolve) => {
      const { checkout } = result;
      const rzp = new window.Razorpay!({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amountMinor,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        prefill: checkout.prefill,
        theme: {
          color:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--color-accent")
              .trim() || "#de7d4d",
        },
        // Hand off to the receipt page, which re-checks with Razorpay.
        handler: async (response: RazorpayResponse) => {
          await confirmAction({
            submissionId: result.submissionId,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          }).catch(() => null);
          pending.current = null;
          router.push(`/f/${slug}/done?s=${result.submissionId}`);
          resolve();
        },
        modal: {
          ondismiss: () =>
            resolve({
              message:
                "Payment wasn't completed. Tap Pay to try again; you won't be charged twice.",
            }),
        },
      });
      rzp.on("payment.failed", () => {
        // Checkout shows the reason and lets them retry inside the same order.
      });
      rzp.open();
    });
  }

  async function onSubmit(answers: Answers): Promise<SubmitFeedback | void> {
    const key = JSON.stringify(answers);
    if (pending.current?.key === key) {
      await loadCheckoutScript();
      return openCheckout(pending.current.checkout);
    }
    const result = await submitAction({
      slug,
      versionId,
      answers,
      website: honeypot || undefined,
    });
    if (!result.ok) {
      if (result.reason === "invalid")
        return {
          errors: result.errors,
          message: "Some answers need attention.",
        };
      return { message: result.message };
    }
    if (result.status === "completed") {
      router.push(`/f/${slug}/done?s=${result.submissionId}`);
      return;
    }
    try {
      await loadCheckoutScript();
    } catch {
      return {
        message:
          "Couldn't load the payment window. Check your connection and try again.",
      };
    }
    pending.current = { key, checkout: result };
    return openCheckout(result);
  }

  return (
    <>
      {/* Honeypot, hidden from people and assistive tech. */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>
      <FormRenderer
        schema={schema}
        onSubmit={onSubmit}
        applyCoupon={(code) => couponAction({ slug, code })}
      />
    </>
  );
}
