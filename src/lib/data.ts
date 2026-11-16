import "server-only";
import { db } from "./supabase";
import { addMonths, monthStart, startOfTodayISTUtc, todayIST } from "./dates";
import type { Client, MonthRow, Option, Payment, Project, Todo } from "./types";

const clean = (q?: string) => (q ?? "").replace(/[,()%*\\"]/g, " ").trim();

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ───────────────────────── Clients

export async function getClients(f: { q?: string; status?: string; source?: string; showLost?: boolean } = {}) {
  let q = db().from("clients").select("*").order("created_at", { ascending: false }).limit(5000);
  const term = clean(f.q);
  if (term) q = q.or(`name.ilike.%${term}%,client_code.ilike.%${term}%`);
  if (f.status) q = q.eq("status", f.status);
  else if (!f.showLost) q = q.neq("status", "Lost");
  if (f.source) q = q.eq("source", f.source);
  return check(await q) as Client[];
}

export async function getClientByCode(code: string) {
  return check(await db().from("clients").select("*").eq("client_code", code).maybeSingle()) as Client | null;
}

export async function getClientOptions(kind: "won" | "notLost" | "all"): Promise<Option[]> {
  let q = db().from("clients").select("id, client_code, name, status").order("client_code").limit(5000);
  if (kind === "won") q = q.eq("status", "Won");
  if (kind === "notLost") q = q.neq("status", "Lost");
  const rows = check(await q) as { id: string; client_code: string; name: string }[];
  return rows.map((r) => ({ value: r.id, label: `${r.client_code} · ${r.name}` }));
}

export async function getPipelineCounts(): Promise<Record<string, number>> {
  const statuses = ["Lead", "Contacted", "Proposal Sent", "Won", "Lost"];
  const res = await Promise.all(
    statuses.map((s) => db().from("clients").select("id", { count: "exact", head: true }).eq("status", s)),
  );
  return Object.fromEntries(statuses.map((s, i) => [s, res[i].count ?? 0]));
}

export async function getFollowUps(today = todayIST()) {
  return check(
    await db()
      .from("clients")
      .select("id, client_code, name, follow_up_date, status")
      .lte("follow_up_date", today)
      .neq("status", "Lost")
      .order("follow_up_date"),
  ) as Pick<Client, "id" | "client_code" | "name" | "follow_up_date" | "status">[];
}

// ───────────────────────── Projects

export async function getProjects(
  f: { status?: string; priority?: string; client?: string; tag?: string; clientId?: string; all?: boolean } = {},
) {
  let q = db()
    .from("project_timeline")
    .select("*")
    .order("priority_rank")
    .order("deadline")
    .limit(2000);
  if (f.status) q = q.eq("status", f.status);
  else if (!f.all) q = q.not("status", "in", "(Completed,Cancelled)");
  if (f.priority) q = q.eq("priority", f.priority);
  if (f.client) q = q.eq("client_code", f.client);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  if (f.tag) q = q.eq("timeline_tag", f.tag);
  return check(await q) as Project[];
}

export async function getProjectByCode(code: string) {
  return check(await db().from("project_timeline").select("*").eq("project_code", code).maybeSingle()) as Project | null;
}

export async function getProjectsByTag(tags: string[]) {
  return check(
    await db().from("project_timeline").select("*").in("timeline_tag", tags).order("deadline").limit(200),
  ) as Project[];
}

export async function getProjectOptions(): Promise<Option[]> {
  const rows = check(
    await db()
      .from("projects")
      .select("id, project_code, name")
      .not("status", "in", "(Completed,Cancelled)")
      .order("project_code")
      .limit(2000),
  ) as { id: string; project_code: string; name: string }[];
  return rows.map((r) => ({ value: r.id, label: `${r.project_code} · ${r.name}` }));
}

// ───────────────────────── Payments

const PAYMENT_SELECT = "*, clients!inner(client_code, name)";

export async function getPayments(f: { q?: string; client?: string; month?: string; mode?: string; clientId?: string } = {}) {
  let q = db().from("payments").select(PAYMENT_SELECT).order("payment_date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  const term = clean(f.q);
  if (term) q = q.or(`name.ilike.%${term}%,client_code.ilike.%${term}%`, { referencedTable: "clients" });
  if (f.client) q = q.eq("clients.client_code", f.client);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  if (f.month) q = q.eq("month", f.month);
  if (f.mode) q = q.eq("mode", f.mode);
  return check(await q) as Payment[];
}

export async function getPaymentsBetween(from: string, to: string) {
  return check(
    await db().from("payments").select("amount").gte("payment_date", from).lte("payment_date", to),
  ) as { amount: number }[];
}

export async function getMonthlyIncome(year?: number): Promise<MonthRow[]> {
  let q = db().from("monthly_income").select("*").order("month", { ascending: false });
  if (year) q = q.gte("month", `${year}-01-01`).lte("month", `${year}-12-01`);
  const rows = check(await q) as MonthRow[];
  return rows.map((r) => ({ month: r.month, total: Number(r.total), count: Number(r.count) }));
}

export async function getIncomeYears(): Promise<number[]> {
  const rows = check(await db().from("monthly_income").select("month")) as { month: string }[];
  const ys = new Set(rows.map((r) => Number(r.month.slice(0, 4))));
  ys.add(Number(todayIST().slice(0, 4)));
  return [...ys].sort((a, b) => b - a);
}

/** Last 12 months including the current one, zero-filled. */
export async function getLast12Months(today = todayIST()) {
  const end = monthStart(today);
  const start = addMonths(end, -11);
  const rows = check(
    await db().from("monthly_income").select("*").gte("month", start).lte("month", end),
  ) as MonthRow[];
  const map = new Map(rows.map((r) => [r.month, Number(r.total)]));
  return Array.from({ length: 12 }, (_, i) => {
    const m = addMonths(start, i);
    return { month: m, total: map.get(m) ?? 0 };
  });
}

// ───────────────────────── To-dos

const TODO_SELECT = "*, projects(project_code, name)";

/** Not done, plus items ticked today (they stay struck through until midnight IST). */
export async function getBoardTodos(today = todayIST()) {
  return check(
    await db()
      .from("todos")
      .select(TODO_SELECT)
      .or(`is_done.eq.false,done_at.gte.${startOfTodayISTUtc(today)}`)
      .order("sort_order")
      .order("created_at")
      .limit(2000),
  ) as Todo[];
}

export async function getProjectTodos(projectId: string) {
  return check(
    await db().from("todos").select(TODO_SELECT).eq("project_id", projectId).order("is_done").order("due_date"),
  ) as Todo[];
}
