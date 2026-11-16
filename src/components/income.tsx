import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { monthLabel } from "@/lib/dates";
import { cn, inr } from "@/lib/format";
import type { MonthRow } from "@/lib/types";
import { Empty } from "./ui";
import { YearSelect } from "./year-select";

export function MonthlyIncomeList({
  rows,
  year,
  years = [],
  emptyAction,
  compact,
}: {
  rows: MonthRow[];
  year: number;
  years?: number[];
  emptyAction?: React.ReactNode;
  compact?: boolean;
}) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const count = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <YearSelect year={year} years={years} />
          <span className="text-[12px] text-muted">Newest first</span>
        </div>
      )}
      {rows.length === 0 ? (
        <Empty message={`No payments in ${year}.`} action={emptyAction} />
      ) : (
        <ul className={compact ? "px-2" : "p-1.5"}>
          {rows.map((r) => (
            <li key={r.month}>
              <Link
                href={`/payments/${r.month.slice(0, 7)}`}
                className={cn("group flex items-center gap-3 rounded-md px-2.5 hover:bg-hover", compact ? "py-2" : "h-10")}
              >
                {compact ? (
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm whitespace-nowrap">{monthLabel(r.month)}</span>
                    <span className="block text-[12px] text-muted">
                      {r.count} payment{r.count === 1 ? "" : "s"}
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm whitespace-nowrap">{monthLabel(r.month)}</span>
                    <span className="text-[12.5px] whitespace-nowrap text-muted">
                      {r.count} payment{r.count === 1 ? "" : "s"}
                    </span>
                  </>
                )}
                <span className="tabular shrink-0 text-right text-sm font-medium sm:w-28">{inr(r.total)}</span>
                <ChevronRight size={14} className="text-faint group-hover:text-muted" />
              </Link>
            </li>
          ))}
          <li className="mt-1 flex h-11 items-center gap-3 border-t border-line px-2.5">
            <span className="flex-1 text-sm font-semibold whitespace-nowrap">
              Total {year}
              {compact && <span className="ml-2 text-[12px] font-normal text-muted">{count} payments</span>}
            </span>
            {!compact && <span className="text-[12.5px] whitespace-nowrap text-muted">{count} payments</span>}
            <span className="tabular shrink-0 text-right text-sm font-semibold sm:w-28">{inr(total)}</span>
            <span className="w-3.5" />
          </li>
        </ul>
      )}
    </div>
  );
}
