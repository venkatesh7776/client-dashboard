import type { ReactNode } from "react";

/** Every page sits on the off-white canvas; content lives in white cards. */
export function ContentArea({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh min-w-0 flex-1 bg-canvas">{children}</div>;
}
