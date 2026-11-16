"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/** The Home dashboard sits on a soft grey canvas so its white cards stand out; other pages stay white like documents. */
export function ContentArea({ children }: { children: ReactNode }) {
  const canvas = usePathname() === "/";
  return <div className={cn("min-h-dvh min-w-0 flex-1", canvas ? "bg-canvas" : "bg-bg")}>{children}</div>;
}
