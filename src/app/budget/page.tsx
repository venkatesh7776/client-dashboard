import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AddExpenseButton, CopyBudgetButton, EditBudgetButton, ExpenseTable } from "@/components/budget/budget-panels";
import { MainRing, SectorRing } from "@/components/budget/rings";
import { Empty, PageHeader, Section } from "@/components/ui";
import { SECTOR_KEYS, SECTORS, type SectorKey } from "@/lib/constants";
import { getBudget, getExpenses, getPreviousBudget } from "@/lib/data";
import { addMonths, daysInMonth, monthLabel, monthStart, todayIST } from "@/lib/dates";
import { cn, inr } from "@/lib/format";

type SP = Promise<Record<string, string | undefined>>;

export default async function BudgetPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const today = todayIST();
  const thisMonth = monthStart(today);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") ? `${sp.month}-01` : thisMonth;
  const sector = (SECTOR_KEYS as readonly string[]).includes(sp.sector ?? "") ? (sp.sector as SectorKey) : undefined;

  const [budget, expenses, previous] = await Promise.all([getBudget(month), getExpenses(month), getPreviousBudget(month)]);

  const spent = Object.fromEntries(SECTOR_KEYS.map((k) => [k, 0])) as Record<SectorKey, number>;
  for (const e of expenses) spent[e.category] += e.amount;
  const spentTotal = SECTOR_KEYS.reduce((s, k) => s + spent[k], 0);

  // Where a new expense lands by default: today, or the last day of a past month being viewed.
  const lastDay = `${month.slice(0, 8)}${String(daysInMonth(month)).padStart(2, "0")}`;
  const defaultDate = month === thisMonth || month > thisMonth ? today : lastDay;

  const ym = (iso: string) => iso.slice(0, 7);
  const qs = (m: string, s?: string) => `/budget?month=${ym(m)}${s ? `&sector=${s}` : ""}`;

  const isCurrent = month === thisMonth;
  const day = Number(today.slice(8, 10));
  const dim = daysInMonth(month);
  const pace = isCurrent ? `Day ${day} of ${dim}` : month < thisMonth ? "Month closed" : "Upcoming";
  const allocated = budget ? SECTOR_KEYS.reduce((s, k) => s + budget[k], 0) : 0;
  const shown = sector ? expenses.filter((e) => e.category === sector) : expenses;

  return (
    <>
      <PageHeader
        title="Budget"
        description={
          <>
            {pace}
            {budget && isCurrent && spentTotal > 0 && <> · {Math.round((spentTotal / budget.total) * 100)}% spent</>}
          </>
        }
        actions={
          <>
            <div className="mr-1 flex items-center gap-0.5">
              <Link href={qs(addMonths(month, -1))} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg" aria-label="Previous month">
                <ChevronLeft size={18} />
              </Link>
              <span className="min-w-[120px] text-center text-[14px] font-medium">{monthLabel(month)}</span>
              <Link href={qs(addMonths(month, 1))} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg" aria-label="Next month">
                <ChevronRight size={18} />
              </Link>
            </div>
            {budget && <EditBudgetButton month={month} budget={budget} />}
            <AddExpenseButton defaultDate={defaultDate} defaultCategory={sector} />
          </>
        }
      />

      {budget ? (
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <section className="card flex flex-col items-center justify-center px-5 py-8">
            <MainRing total={budget.total} spent={spent} />
            {allocated < budget.total && (
              <p className="tabular mt-3 text-[12.5px] text-faint">{inr(budget.total - allocated)} not given to any sector</p>
            )}
          </section>
          <section className="card grid grid-cols-2 overflow-hidden">
            {SECTORS.map((s, i) => (
              <div key={s.key} className={cn("border-line", i % 2 === 0 && "border-r", i < 2 && "border-b")}>
                <SectorRing
                  sector={s}
                  budget={budget[s.key]}
                  spent={spent[s.key]}
                  selected={sector === s.key}
                  href={sector === s.key ? qs(month) : qs(month, s.key)}
                />
              </div>
            ))}
          </section>
        </div>
      ) : (
        <section className="card flex flex-col items-center gap-4 px-5 py-14 text-center">
          <p className="text-[15px] font-medium">No budget for {monthLabel(month)} yet</p>
          <p className="max-w-sm text-[13px] text-muted">
            Set the main budget and split it across Personal, Ads, Physical tools and Digital tools.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {previous && <CopyBudgetButton from={previous} to={month} />}
            <EditBudgetButton month={month} budget={null} variant={previous ? "outline" : "primary"} />
          </div>
          {spentTotal > 0 && <p className="tabular text-[13px] text-muted">{inr(spentTotal)} already spent this month</p>}
        </section>
      )}

      <Section
        className="mt-6"
        title={sector ? `${SECTORS.find((s) => s.key === sector)!.label} expenses` : "Expenses"}
        action={
          <span className="flex items-center gap-3 text-[13px]">
            {shown.length > 0 && <span className="tabular text-muted">{shown.length} · {inr(shown.reduce((s, e) => s + e.amount, 0))}</span>}
            {sector && (
              <Link href={qs(month)} scroll={false} className="text-muted underline-offset-2 hover:text-fg hover:underline">
                Show all
              </Link>
            )}
          </span>
        }
      >
        {shown.length === 0 ? (
          <Empty message={sector ? "Nothing spent in this sector yet." : `No expenses in ${monthLabel(month)} yet.`} />
        ) : (
          <div className="pb-1">
            <ExpenseTable expenses={shown} />
          </div>
        )}
      </Section>
    </>
  );
}
