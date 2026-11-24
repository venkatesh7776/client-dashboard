const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹1,20,000 */
export function inr(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return "₹" + inrFmt.format(Number(n));
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Spoken length of a script at ~150 words a minute: "~45s", "~1m 20s". */
export function reelLength(script?: string | null): { words: number; label: string } | null {
  const words = (script ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (!words) return null;
  const secs = Math.max(1, Math.round(words / 2.5));
  const label = secs < 60 ? `~${secs}s` : `~${Math.floor(secs / 60)}m${secs % 60 ? ` ${secs % 60}s` : ""}`;
  return { words, label };
}
