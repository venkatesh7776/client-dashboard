import { addDays, addMonths, daysInMonth, fmtDate, monthLabel, monthStart } from "./dates";

export type Range = { key: string; label: string; from: string; to: string; prevFrom: string; prevTo: string; compareLabel: string };

const DAY_OPTIONS = [7, 15, 30, 90, 180];

/** Options for the revenue filter: this/last month, each of the past 12 months, and "past N days". */
export function rangeOptions(today: string) {
  const thisM = monthStart(today);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(thisM, -(i + 2)));
  return [
    { group: "Months", items: [
      { key: "this_month", label: `This month · ${monthLabel(thisM)}` },
      { key: "last_month", label: `Last month · ${monthLabel(addMonths(thisM, -1))}` },
      ...months.map((m) => ({ key: `m-${m.slice(0, 7)}`, label: monthLabel(m) })),
    ] },
    { group: "Days", items: DAY_OPTIONS.map((d) => ({ key: `d-${d}`, label: `Past ${d} days` })) },
  ];
}

export function resolveRange(key: string | undefined, today: string): Range {
  const thisM = monthStart(today);
  const dm = key?.match(/^d-(\d{1,3})$/);
  if (dm) {
    const n = Math.min(Math.max(Number(dm[1]), 1), 366);
    const from = addDays(today, -(n - 1));
    return {
      key: key!,
      label: `Past ${n} days`,
      from,
      to: today,
      prevFrom: addDays(from, -n),
      prevTo: addDays(from, -1),
      compareLabel: `the ${n} days before`,
    };
  }
  let m = thisM;
  if (key === "last_month") m = addMonths(thisM, -1);
  const mm = key?.match(/^m-(\d{4}-\d{2})$/);
  if (mm) m = `${mm[1]}-01`;
  const prev = addMonths(m, -1);
  if (m === thisM) {
    // This month so far vs the same days of last month
    const day = Number(today.slice(8, 10));
    const prevTo = addDays(prev, Math.min(day, daysInMonth(prev)) - 1);
    return { key: "this_month", label: `This month · ${monthLabel(m)}`, from: m, to: today, prevFrom: prev, prevTo, compareLabel: `${fmtDate(prev).slice(3)} up to ${fmtDate(prevTo).slice(0, 6)}` };
  }
  const end = addDays(m, daysInMonth(m) - 1);
  return {
    key: key === "last_month" ? "last_month" : `m-${m.slice(0, 7)}`,
    label: key === "last_month" ? `Last month · ${monthLabel(m)}` : monthLabel(m),
    from: m,
    to: end,
    prevFrom: prev,
    prevTo: addDays(prev, daysInMonth(prev) - 1),
    compareLabel: monthLabel(prev),
  };
}
