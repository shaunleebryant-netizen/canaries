"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** After Stripe checkout, access arrives via webhook a few seconds later: refresh the page until it does. */
export function PollRefresh({ everyMs = 3000, max = 8 }: { everyMs?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= max) clearInterval(t);
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs, max]);
  return null;
}
