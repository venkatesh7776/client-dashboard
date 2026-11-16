// All date logic runs in Asia/Kolkata and works on plain "yyyy-MM-dd" strings,
// so the server's timezone never matters.

export const TZ = "Asia/Kolkata";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Today's date in IST as yyyy-MM-dd. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** a − b in whole calendar days. */
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86_400_000);
}

/** "16 Nov 2026" */
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "October 2026" from any date in that month */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function monthShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

/** First day of the month, yyyy-MM-01 */
export function monthStart(iso: string): string {
  return iso.slice(0, 8) + "01";
}

/** Shift a yyyy-MM-01 by n months. */
export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export function daysInMonth(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Start of today in IST as a UTC ISO timestamp. */
export function startOfTodayISTUtc(today = todayIST()): string {
  return new Date(today + "T00:00:00+05:30").toISOString();
}

/** Milliseconds until the next midnight in IST. */
export function msUntilISTMidnight(now: Date = new Date()): number {
  const tomorrow = addDays(todayIST(now), 1);
  return Date.parse(tomorrow + "T00:00:00+05:30") - now.getTime();
}

/** "in 3 days" / "today" / "2 days ago" */
export function relDays(n: number): string {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
