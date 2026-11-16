import { ArrowDownRight, ArrowUpRight, Bell, Plus } from "lucide-react";
import Link from "next/link";
import { IncomeChart } from "@/components/income-chart";
import { MonthlyIncomeList } from "@/components/income";
import { MidnightRefresh } from "@/components/midnight-refresh";
import { RangeSelect } from "@/components/range-select";
import { Empty, LinkButton, Pill, Section } from "@/components/ui";
import { TodoList } from "@/components/todo-list";
import { CLIENT_STATUSES } from "@/lib/constants";
import {
  getBoardTodos,
  getFollowUps,
  getIncomeYears,
  getLast12Months,
  getMonthlyIncome,
  getPaymentsBetween,
  getPipelineCounts,
  getProjectsByTag,
} from "@/lib/data";
import { fmtDate, monthStart, todayIST } from "@/lib/dates";
import { rangeOptions, resolveRange } from "@/lib/ranges";
import { cn, inr } from "@/lib/format";
import { cardFor } from "@/lib/todos";

type SP = Promise<Record<string, string | undefined>>;

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const today = todayIST();
  const thisMonth = monthStart(today);
  const year = Number(sp.year) || Number(today.slice(0, 4));
  const range = resolveRange(sp.income, today);

  const [chart, months, years, inRange, inPrev, pipeline, timeline, todos, followUps] = await Promise.all([
    getLast12Months(today),
    getMonthlyIncome(year),
    getIncomeYears(),
    getPaymentsBetween(range.from, range.to),
    getPaymentsBetween(range.prevFrom, range.prevTo),
    getPipelineCounts(),
    getProjectsByTag(["Overdue", "Should Have Started", "Due Soon", "Start Soon"]),
    getBoardTodos(today),
    getFollowUps(today),
  ]);

  const total = inRange.reduce((s, p) => s + Number(p.amount), 0);
  const prevTotal = inPrev.reduce((s, p) => s + Number(p.amount), 0);
  const delta = total - prevTotal;
  const pct = prevTotal > 0 ? Math.round((delta / prevTotal) * 100) : null;

  const toStart = timeline
    .filter((p) => p.timeline_tag === "Should Have Started" || p.timeline_tag === "Start Soon")
    .sort((a, b) => (a.timeline_tag === b.timeline_tag ? (a.start_date ?? "").localeCompare(b.start_date ?? "") : a.timeline_tag === "Should Have Started" ? -1 : 1));
  const deadlines = timeline
    .filter((p) => p.timeline_tag === "Overdue" || p.timeline_tag === "Due Soon")
    .sort((a, b) => (a.timeline_tag === b.timeline_tag ? (a.deadline ?? "").localeCompare(b.deadline ?? "") : a.timeline_tag === "Overdue" ? -1 : 1));
  const todayTodos = todos.filter((t) => cardFor(t.due_date, today) === "today");

  return (
    <>
      <div className="mb-8">
        <p className="text-[13px] text-muted">
          {WEEKDAY.format(new Date())}, {fmtDate(today)}
        </p>
        <h1 className="mt-1 text-[30px] leading-tight font-bold tracking-[-0.02em] sm:text-[36px]">Home</h1>
      </div>

      {/* Revenue — one card, with a period filter */}
      <div className="mb-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[13px] text-muted">Revenue</div>
          <RangeSelect value={range.key} groups={rangeOptions(today)} />
        </div>
        <div className="tabular mt-2 text-[36px] leading-tight font-semibold tracking-tight sm:text-[40px]">{inr(total)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <span>
            {fmtDate(range.from)} – {fmtDate(range.to)} · {inRange.length} payment{inRange.length === 1 ? "" : "s"}
          </span>
          <span className="text-faint">·</span>
          <span className="inline-flex items-center gap-1">
            {delta !== 0 && (
              <span className="inline-flex items-center" style={{ color: `var(--tag-${delta > 0 ? "green" : "red"}-fg)` }}>
                {delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {pct !== null ? `${Math.abs(pct)}%` : inr(Math.abs(delta))}
              </span>
            )}
            {delta === 0 ? "Same as" : "vs"} {inr(prevTotal)} in {range.compareLabel}
          </span>
        </div>
      </div>

      {/* DB-8 Pipeline */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[13px] text-muted">Pipeline</span>
        {CLIENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/clients?view=table&status=${encodeURIComponent(s)}`}
            className="flex items-center gap-1.5 rounded-[5px] py-1 pr-2 pl-1 transition-colors hover:bg-hover"
          >
            <Pill>{s}</Pill>
            <span className="tabular text-sm font-medium">{pipeline[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* DB-7 */}
        <Section title="Today's to-dos" action={<Link href="/todos" className="text-[13px] text-muted hover:text-fg">Open board</Link>}>
          {followUps.length > 0 && (
            <div className="border-b border-line p-1.5">
              {followUps.map((f) => (
                <Link key={f.id} href={`/clients/${f.client_code}`} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-hover">
                  <Bell size={14} className="shrink-0" style={{ color: "var(--tag-orange-fg)" }} />
                  <span className="truncate">Follow up with {f.name}</span>
                  <span className="tabular ml-auto text-[12px] text-muted">{f.client_code}</span>
                </Link>
              ))}
            </div>
          )}
          {todayTodos.length === 0 ? (
            followUps.length === 0 && (
              <Empty message="Nothing planned for today." action={<LinkButton href="/todos" size="sm"><Plus size={14} /> Add to-do</LinkButton>} />
            )
          ) : (
            <TodoList todos={todayTodos} today={today} showDate={false} />
          )}
        </Section>

        <div className="space-y-6">
          {/* DB-6 */}
          <Section title="Upcoming deadlines">
            {deadlines.length === 0 ? (
              <Empty message="No deadlines in the next 7 days." action={<LinkButton href="/projects?new=1" size="sm"><Plus size={14} /> Add project</LinkButton>} />
            ) : (
              <ul className="p-1.5">
                {deadlines.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.project_code}`} className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-hover">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-[12.5px] text-muted">
                          {p.client_code} · Due {fmtDate(p.deadline)}
                        </div>
                      </div>
                      <span className={cn("tabular text-[12.5px] whitespace-nowrap", (p.days_left ?? 0) < 0 ? "text-danger" : "text-muted")}>
                        {p.days_left === null ? "" : p.days_left < 0 ? `${-p.days_left}d overdue` : p.days_left === 0 ? "Today" : `${p.days_left}d left`}
                      </span>
                      <Pill>{p.timeline_tag!}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          {/* DB-5 */}
          <Section title="Projects to start">
            {toStart.length === 0 ? (
              <Empty message="No projects need starting soon." action={<LinkButton href="/projects?new=1" size="sm"><Plus size={14} /> Add project</LinkButton>} />
            ) : (
              <ul className="p-1.5">
                {toStart.map((p) => {
                  const d = p.days_until_start ?? 0;
                  return (
                    <li key={p.id}>
                      <Link href={`/projects/${p.project_code}`} className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-hover">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          <div className="text-[12.5px] text-muted">
                            {p.client_code} · Start {fmtDate(p.start_date)}
                          </div>
                        </div>
                        <span className={cn("tabular text-[12.5px] whitespace-nowrap", d < 0 ? "text-danger" : "text-muted")}>
                          {d < 0 ? `${-d}d late` : d === 0 ? "Today" : `in ${d}d`}
                        </span>
                        <Pill>{p.timeline_tag!}</Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* DB-4 */}
        <Section title="Income · last 12 months">
          {chart.every((m) => m.total === 0) ? (
            <Empty message="No income recorded yet." action={<LinkButton href="/payments?new=1" size="sm"><Plus size={14} /> Add payment</LinkButton>} />
          ) : (
            <IncomeChart data={chart} current={thisMonth} />
          )}
        </Section>
        {/* DB-3 */}
        <Section title="Monthly income">
          <MonthlyIncomeList
            rows={months}
            year={year}
            years={years}
            emptyAction={<LinkButton href="/payments?new=1" size="sm"><Plus size={14} /> Add payment</LinkButton>}
          />
        </Section>
      </div>

      <MidnightRefresh today={today} />
    </>
  );
}
