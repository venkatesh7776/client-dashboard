"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { msUntilISTMidnight, todayIST } from "@/lib/dates";

/** Re-renders the page at midnight IST (and when the tab wakes on a new day) so cards roll forward. */
export function MidnightRefresh({ today }: { today: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.refresh(), msUntilISTMidnight() + 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && todayIST() !== today) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, today]);
  return null;
}
