const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹1,20,000 */
export function inr(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return "₹" + inrFmt.format(Number(n));
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
