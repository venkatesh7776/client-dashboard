import { addDays, addMonths, daysInMonth, diffDays, fmtDate, monthLabel, monthShort, monthStart } from "./dates";

export type Bucket = "day" | "week" | "month";

export type Range = {
  key: string;
  label: string;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  compareLabel: string;
  /** how the chart groups payments for this range */
  bucket: Bucket;
};

const DAY_OPTIONS = [7, 15, 30, 90, 180];

/** Options for the revenue filter: this/last month, each of the past 12 months, "past N days", past 12 months. */
export function rangeOptions(today: string) {
  const thisM = monthStart(today);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(thisM, -(i + 2)));
  return [
    {
      group: "Months",
      items: [
        { key: "this_month", label: `This month · ${monthLabel(thisM)}` },
        { key: "last_month", label: `Last month · ${monthLabel(addMonths(thisM, -1))}` },
        ...months.map((m) => ({ key: `m-${m.slice(0, 7)}`, label: monthLabel(m) })),
      ],
    },
    {
      group: "Days",
      items: [...DAY_OPTIONS.map((d) => ({ key: `d-${d}`, label: `Past ${d} days` })), { key: "y-12", label: "Past 12 months" }],
    },
  ];
}

export function resolveRange(key: string | undefined, today: string): Range {
  const thisM = monthStart(today);

  if (key === "y-12") {
    const from = addMonths(thisM, -11);
    return {
      key,
      label: "Past 12 months",
      from,
      to: today,
      prevFrom: addMonths(from, -12),
      prevTo: addDays(from, -1),
      compareLabel: "the 12 months before",
      bucket: "month",
    };
  }

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
      bucket: n <= 31 ? "day" : "week",
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
    return {
      key: "this_month",
      label: `This month · ${monthLabel(m)}`,
      from: m,
      to: today,
      prevFrom: prev,
      prevTo,
      compareLabel: `${fmtDate(prev).slice(3)} up to ${fmtDate(prevTo).slice(0, 6)}`,
      bucket: "day",
    };
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
    bucket: "day",
  };
}

export type ChartPoint = { key: string; label: string; tip: string; total: number };

/** Group payments into the range's buckets, zero-filling empty ones so the axis is continuous. */
export function bucketPayments(range: Range, rows: { payment_date: string; amount: number }[]): ChartPoint[] {
  const points: ChartPoint[] = [];
  if (range.bucket === "month") {
    for (let m = monthStart(range.from); m <= range.to; m = addMonths(m, 1)) {
      points.push({ key: m, label: monthShort(m), tip: monthLabel(m), total: 0 });
    }
    for (const r of rows) {
      const p = points.find((x) => x.key === monthStart(r.payment_date));
      if (p) p.total += Number(r.amount);
    }
  } else {
    const step = range.bucket === "week" ? 7 : 1;
    for (let d = range.from; d <= range.to; d = addDays(d, step)) {
      const end = step === 1 ? d : [addDays(d, step - 1), range.to].sort()[0];
      points.push({
        key: d,
        label: fmtDate(d).slice(0, 6),
        tip: step === 1 ? fmtDate(d) : `${fmtDate(d).slice(0, 6)} – ${fmtDate(end)}`,
        total: 0,
      });
    }
    for (const r of rows) {
      const idx = Math.floor(diffDays(r.payment_date, range.from) / step);
      if (points[idx]) points[idx].total += Number(r.amount);
    }
  }
  return points;
}

/** The bucket that contains today (highlighted in the chart), if the range includes today. */
export function currentBucketKey(range: Range, points: ChartPoint[], today: string): string | null {
  if (today < range.from || today > range.to) return null;
  if (range.bucket === "month") return monthStart(today);
  for (let i = points.length - 1; i >= 0; i--) if (points[i].key <= today) return points[i].key;
  return null;
}
