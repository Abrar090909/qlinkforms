"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-render the receipt every few seconds while a payment is pending (max ~3 min). */
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (tries > 45) clearInterval(timer);
      else router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
