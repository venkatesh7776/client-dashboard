import { ArrowDownRight, ArrowUpRight, Bell } from "lucide-react";
import Link from "next/link";
import { IncomeChart } from "@/components/income-chart";
import { MonthlyIncomeList } from "@/components/income";
import { MidnightRefresh } from "@/components/midnight-refresh";
import { RangeSelect } from "@/components/range-select";
import { TodoList } from "@/components/todo-list";
import { Panel, PanelEmpty, Pill } from "@/components/ui";
import { YearSelect } from "@/components/year-select";
import { CLIENT_STATUSES } from "@/lib/constants";
import {
  getBoardTodos,
  getFollowUps,
  getIncomeYears,
  getMonthlyIncome,
  getPaymentsBetween,
  getPipelineCounts,
  getProjectsByTag,
} from "@/lib/data";
import { fmtDate, monthLabel, todayIST } from "@/lib/dates";
import { cn, inr } from "@/lib/format";
import { bucketPayments, currentBucketKey, rangeOptions, resolveRange } from "@/lib/ranges";
import { cardFor } from "@/lib/todos";
import { ensureStartTodos } from "@/lib/auto-todos";
import type { Project } from "@/lib/types";

type SP = Promise<Record<string, string | undefined>>;

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const today = todayIST();
  const year = Number(sp.year) || Number(today.slice(0, 4));
  const range = resolveRange(sp.income, today);
  await ensureStartTodos(today);

  const [months, years, inRange, inPrev, pipeline, timeline, todos, followUps] = await Promise.all([
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
  const yearTotal = months.reduce((s, m) => s + m.total, 0);
  const monthsElapsed = year === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 12;
  const best = months.reduce((a, m) => (m.total > a.total ? m : a), { month: `${year}-01-01`, total: 0, count: 0 });
  const chart = bucketPayments(range, inRange);
  const current = currentBucketKey(range, chart, today);
  const bucketWord = { day: "Daily", week: "Weekly", month: "Monthly" }[range.bucket];
  const currentWord = { day: "Today", week: "This week", month: "This month" }[range.bucket];
  const prevTotal = inPrev.reduce((s, p) => s + Number(p.amount), 0);
  const delta = total - prevTotal;
  const pct = prevTotal > 0 ? Math.round((delta / prevTotal) * 100) : null;

  const deadlines = timeline
    .filter((p) => p.timeline_tag === "Overdue" || p.timeline_tag === "Due Soon")
    .sort((a, b) => (a.timeline_tag === b.timeline_tag ? (a.deadline ?? "").localeCompare(b.deadline ?? "") : a.timeline_tag === "Overdue" ? -1 : 1));
  const toStart = timeline
    .filter((p) => p.timeline_tag === "Should Have Started" || p.timeline_tag === "Start Soon")
    .sort((a, b) => (a.timeline_tag === b.timeline_tag ? (a.start_date ?? "").localeCompare(b.start_date ?? "") : a.timeline_tag === "Should Have Started" ? -1 : 1));
  const todayTodos = todos.filter((t) => cardFor(t.due_date, today) === "today");
  const openToday = todayTodos.filter((t) => !t.is_done).length + followUps.length;

  return (
    <>
      <header className="mb-6">
        <p className="text-[13px] text-muted">
          {WEEKDAY.format(new Date())}, {fmtDate(today)}
        </p>
        <h1 className="mt-1 text-[30px] leading-tight font-bold tracking-[-0.02em] sm:text-[36px]">Home</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Income: headline number + 12-month chart, one panel */}
        <Panel className="lg:col-span-2" title="Income" action={<RangeSelect value={range.key} groups={rangeOptions(today)} />}>
          <div className="px-5 pt-1">
            <div className="tabular text-[40px] leading-none font-semibold tracking-[-0.02em]">{inr(total)}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              <span>
                {fmtDate(range.from)} – {fmtDate(range.to)} · {inRange.length} payment{inRange.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                {delta !== 0 && (
                  <span className="inline-flex items-center font-medium" style={{ color: `var(--tag-${delta > 0 ? "green" : "red"}-fg)` }}>
                    {delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {pct !== null ? `${Math.abs(pct)}%` : inr(Math.abs(delta))}
                  </span>
                )}
                {delta === 0 ? "same as" : "vs"} {inr(prevTotal)} in {range.compareLabel}
              </span>
            </div>
          </div>
          <div className="mt-4 border-t border-line px-2 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 pt-1 text-[12px] text-muted">
              <span>
                {bucketWord} · {range.label}
              </span>
              {current && (
                <span className="inline-flex items-center gap-3">
                  <Legend color="var(--chart-1)" label="Earlier" />
                  <Legend color="var(--chart-2)" label={currentWord} />
                </span>
              )}
            </div>
            <IncomeChart data={chart} current={current} />
          </div>
        </Panel>

        <Panel title="Monthly income" action={<YearSelect year={year} years={years} />}>
          <MonthlyIncomeList rows={months} year={year} compact />
          {months.length > 0 && (
            <div className="mx-5 mt-auto grid grid-cols-2 gap-4 border-t border-line pt-4">
              <div>
                <div className="text-[12px] text-muted">Avg. per month</div>
                <div className="tabular mt-0.5 text-[17px] font-semibold">{inr(Math.round(yearTotal / monthsElapsed))}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted">Best month</div>
                <div className="tabular mt-0.5 text-[17px] font-semibold">{inr(best.total)}</div>
                <div className="text-[12px] text-muted">{monthLabel(best.month)}</div>
              </div>
            </div>
          )}
        </Panel>

        {/* Pipeline strip */}
        <Panel className="lg:col-span-3" title="Pipeline" action={<Link href="/clients" className="text-[13px] text-muted hover:text-fg">All clients</Link>}>
          <div className="grid grid-cols-3 sm:grid-cols-6">
            {CLIENT_STATUSES.map((s, i) => (
              <Link
                key={s}
                href={`/clients?view=table&status=${encodeURIComponent(s)}`}
                className={cn(
                  "group flex min-w-0 flex-col gap-2 px-3 py-4 transition-colors hover:bg-hover sm:px-5",
                  i % 3 !== 0 && "border-l border-line",
                  i >= 3 && "border-t border-line sm:border-t-0",
                  i === 3 && "sm:border-l",
                )}
              >
                <span>
                  <Pill>{s}</Pill>
                </span>
                <span className="tabular text-[24px] leading-none font-semibold">{pipeline[s] ?? 0}</span>
              </Link>
            ))}
          </div>
        </Panel>

        {/* Today */}
        <Panel
          title="Today"
          count={openToday}
          action={<Link href="/todos" className="text-[13px] text-muted hover:text-fg">Open board</Link>}
        >
          {followUps.length > 0 && (
            <div className="px-2 pb-1">
              {followUps.map((f) => (
                <Link key={f.id} href={`/clients/${f.client_code}`} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-hover">
                  <Bell size={14} className="shrink-0" style={{ color: "var(--tag-orange-fg)" }} />
                  <span className="truncate">Follow up with {f.name}</span>
                  <span className="tabular ml-auto text-[12px] text-muted">{f.client_code}</span>
                </Link>
              ))}
            </div>
          )}
          {todayTodos.length > 0 ? (
            <div className="px-0.5">
              <TodoList todos={todayTodos} today={today} showDate={false} />
            </div>
          ) : followUps.length === 0 ? (
            <PanelEmpty text="Nothing planned for today." href="/todos" cta="Add a to-do" />
          ) : null}
        </Panel>

        {/* Deadlines (first), then projects to start */}
        <Panel title="Upcoming deadlines" count={deadlines.length}>
          {deadlines.length === 0 ? (
            <PanelEmpty text="No deadlines in the next 7 days." />
          ) : (
            <ProjectRows
              projects={deadlines}
              sub={(p) => `Due ${fmtDate(p.deadline)}`}
              right={(p) =>
                p.days_left === null ? "" : p.days_left < 0 ? `${-p.days_left}d overdue` : p.days_left === 0 ? "Today" : `${p.days_left}d left`
              }
              late={(p) => (p.days_left ?? 0) < 0}
            />
          )}
        </Panel>

        <Panel title="Projects to start" count={toStart.length}>
          {toStart.length === 0 ? (
            <PanelEmpty text="Nothing needs starting soon." />
          ) : (
            <ProjectRows
              projects={toStart}
              sub={(p) => `Start ${fmtDate(p.start_date)}`}
              right={(p) => {
                const d = p.days_until_start ?? 0;
                return d < 0 ? `${-d}d late` : d === 0 ? "Today" : `in ${d}d`;
              }}
              late={(p) => (p.days_until_start ?? 0) < 0}
            />
          )}
        </Panel>
      </div>

      <MidnightRefresh today={today} />
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
  );
}

function ProjectRows({
  projects,
  sub,
  right,
  late,
}: {
  projects: Project[];
  sub: (p: Project) => string;
  right: (p: Project) => string;
  late: (p: Project) => boolean;
}) {
  return (
    <ul className="px-2 pb-1">
      {projects.map((p) => (
        <li key={p.id}>
          <Link href={`/projects/${p.project_code}`} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-hover">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="truncate text-[12.5px] text-muted">
                {p.client_code} · {sub(p)}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Pill>{p.timeline_tag!}</Pill>
              <span className={cn("tabular text-[12px]", late(p) ? "text-danger" : "text-muted")}>{right(p)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
