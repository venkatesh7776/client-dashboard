import "server-only";
import { isStepCount, ToolLoopAgent, tool, type InferAgentUIMessage } from "ai";
import { z } from "zod";
import { quickAddTodo, saveClient, savePayment, saveProject, saveTodo, setClientStatus, setProjectStatus, toggleTodo } from "@/app/actions";
import { CLIENT_STATUSES, LEAD_SOURCES, PAYMENT_MODES, PRIORITIES, PROJECT_STATUSES, TIMELINE_TAGS } from "@/lib/constants";
import { getBoardTodos, getFollowUps, getMonthlyIncome, getPayments, getProjects, getProjectsByTag } from "@/lib/data";
import { addDays, addMonths, fmtDate, monthLabel, monthStart, todayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { db } from "@/lib/supabase";
import { cardDate, cardFor } from "@/lib/todos";
import { AGENT_MODEL, vertex } from "./vertex";

// ───────────────────────── helpers

type ClientRow = { id: string; client_code: string; name: string; status: string };

const clean = (s: string) => s.replace(/[,()%*\\"]/g, " ").trim();

/** Resolve "CL-004", "4", or a (partial) name to exactly one client. */
async function resolveClient(ref: string): Promise<{ client?: ClientRow; error?: string; matches?: ClientRow[] }> {
  const r = ref.trim();
  const code = r.match(/^(?:cl-?)?(\d{1,6})$/i);
  if (code) {
    const c = `CL-${code[1].padStart(3, "0")}`;
    const { data } = await db().from("clients").select("id, client_code, name, status").eq("client_code", c).maybeSingle();
    return data ? { client: data } : { error: `No client with ID ${c}.` };
  }
  const { data } = await db()
    .from("clients")
    .select("id, client_code, name, status")
    .ilike("name", `%${clean(r)}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as ClientRow[];
  const exact = rows.filter((x) => x.name.toLowerCase() === r.toLowerCase());
  if (exact.length === 1) return { client: exact[0] };
  if (rows.length === 1) return { client: rows[0] };
  if (rows.length === 0) return { error: `No client matching "${r}".` };
  return { error: `Several clients match "${r}". Ask which one.`, matches: rows };
}

async function resolveProject(ref: string) {
  const r = ref.trim();
  const code = r.match(/^(?:pr-?)?(\d{1,6})$/i);
  let q = db().from("projects").select("id, project_code, name, client_id, start_date, deadline, priority, status, value, notes");
  q = code ? q.eq("project_code", `PR-${code[1].padStart(3, "0")}`) : q.ilike("name", `%${clean(r)}%`);
  const { data } = await q.limit(10);
  const rows = data ?? [];
  if (rows.length === 1) return { project: rows[0] };
  if (rows.length === 0) return { error: `No project matching "${r}".` };
  return { error: `Several projects match "${r}". Ask which one.`, matches: rows.map((p) => `${p.project_code} · ${p.name}`) };
}

function fail(r: { error?: string; errors?: Record<string, string | undefined> }) {
  const fields = r.errors ? Object.entries(r.errors).map(([k, v]) => `${k}: ${v}`).join("; ") : "";
  return { ok: false as const, kind: "write" as const, error: [r.error, fields].filter(Boolean).join(" ") || "Could not save." };
}

const done = (summary: string, link?: string) => ({ ok: true as const, kind: "write" as const, summary, link });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("yyyy-MM-dd");
const when = z.enum(["today", "tomorrow", "day_after", "later"]);

// ───────────────────────── tools

const tools = {
  searchClients: tool({
    description: "Find clients/leads by name or Client ID, optionally by status. Use before acting on a client you are unsure about.",
    inputSchema: z.object({
      query: z.string().optional().describe("Name or Client ID, partial is fine"),
      status: z.enum(CLIENT_STATUSES).optional(),
    }),
    execute: async ({ query, status }) => {
      let q = db().from("clients").select("client_code, name, status, source, expected_value, follow_up_date").order("created_at", { ascending: false }).limit(25);
      if (query) q = q.or(`name.ilike.%${clean(query)}%,client_code.ilike.%${clean(query)}%`);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return { ok: false, kind: "read" as const, error: error.message };
      return { ok: true, kind: "read" as const, summary: `Looked up clients`, clients: data };
    },
  }),

  getClientDetails: tool({
    description: "Full details of one client: contact info, projects with timeline status, payments and total received.",
    inputSchema: z.object({ client: z.string().describe("Client ID like CL-004 or the client's name") }),
    execute: async ({ client }) => {
      const r = await resolveClient(client);
      if (!r.client) return { ok: false, kind: "read" as const, error: r.error, matches: r.matches };
      const [{ data: full }, projects, payments] = await Promise.all([
        db().from("clients").select("*").eq("id", r.client.id).single(),
        getProjects({ clientId: r.client.id, all: true }),
        getPayments({ clientId: r.client.id }),
      ]);
      return {
        ok: true,
        kind: "read" as const,
        summary: `Opened ${r.client.client_code} · ${r.client.name}`,
        link: `/clients/${r.client.client_code}`,
        client: full,
        projects: projects.map((p) => ({ code: p.project_code, name: p.name, status: p.status, start: p.start_date, deadline: p.deadline, days_left: p.days_left, timeline: p.timeline_tag })),
        payments: payments.slice(0, 20).map((p) => ({ code: p.payment_code, date: p.payment_date, amount: Number(p.amount), mode: p.mode })),
        total_received: payments.reduce((s, p) => s + Number(p.amount), 0),
      };
    },
  }),

  addClient: tool({
    description: "Create a new lead or client. Status defaults to Lead.",
    inputSchema: z.object({
      name: z.string(),
      status: z.enum(CLIENT_STATUSES).optional(),
      source: z.enum(LEAD_SOURCES).optional(),
      contact_person: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      expected_value: z.number().optional().describe("Rupees"),
      follow_up_date: isoDate.optional(),
      notes: z.string().optional(),
    }),
    execute: async (input) => {
      const r = await saveClient(null, { status: "Lead", ...input });
      if (!r.ok) return fail(r);
      const status = input.status ?? "Lead";
      return done(`Added ${r.label} as ${status}`, `/clients/${r.code}`);
    },
  }),

  updateClient: tool({
    description: "Change fields of an existing client (status, follow-up date, contact details, notes…). Only pass fields that change.",
    inputSchema: z.object({
      client: z.string().describe("Client ID or name"),
      changes: z.object({
        name: z.string().optional(),
        status: z.enum(CLIENT_STATUSES).optional(),
        source: z.enum(LEAD_SOURCES).optional(),
        contact_person: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        expected_value: z.number().optional(),
        follow_up_date: isoDate.nullable().optional().describe("null clears it"),
        lost_reason: z.string().optional(),
        notes: z.string().optional().describe("Replaces the notes; include existing text if appending"),
      }),
    }),
    execute: async ({ client, changes }) => {
      const r = await resolveClient(client);
      if (!r.client) return { ok: false, kind: "write" as const, error: r.error, matches: r.matches };
      const keys = Object.keys(changes);
      if (keys.length === 1 && changes.status) {
        const s = await setClientStatus(r.client.id, changes.status);
        if (!s.ok) return fail(s);
        return done(`${r.client.client_code} · ${r.client.name} → ${changes.status}`, `/clients/${r.client.client_code}`);
      }
      const { data: cur } = await db().from("clients").select("*").eq("id", r.client.id).single();
      const s = await saveClient(r.client.id, { ...cur, ...changes });
      if (!s.ok) return fail(s);
      return done(`Updated ${s.label}: ${keys.join(", ").replace(/_/g, " ")}`, `/clients/${s.code}`);
    },
  }),

  searchProjects: tool({
    description: "List projects, optionally filtered. Hides Completed/Cancelled unless includeClosed or a status is given.",
    inputSchema: z.object({
      client: z.string().optional().describe("Client ID or name"),
      status: z.enum(PROJECT_STATUSES).optional(),
      timeline: z.enum(TIMELINE_TAGS).optional(),
      includeClosed: z.boolean().optional(),
    }),
    execute: async ({ client, status, timeline, includeClosed }) => {
      let clientId: string | undefined;
      if (client) {
        const r = await resolveClient(client);
        if (!r.client) return { ok: false, kind: "read" as const, error: r.error, matches: r.matches };
        clientId = r.client.id;
      }
      const rows = await getProjects({ clientId, status, tag: timeline, all: includeClosed });
      return {
        ok: true,
        kind: "read" as const,
        summary: "Looked up projects",
        projects: rows.slice(0, 40).map((p) => ({
          code: p.project_code, name: p.name, client: `${p.client_code} · ${p.client_name}`, start: p.start_date,
          deadline: p.deadline, days_left: p.days_left, priority: p.priority, status: p.status, timeline: p.timeline_tag,
        })),
      };
    },
  }),

  addProject: tool({
    description: "Create a project for a Won client. Ask for the deadline if the user didn't give one. Start date defaults to today.",
    inputSchema: z.object({
      client: z.string().describe("Client ID or name"),
      name: z.string(),
      start_date: isoDate.optional(),
      deadline: isoDate,
      priority: z.enum(PRIORITIES).optional(),
      status: z.enum(PROJECT_STATUSES).optional(),
      value: z.number().optional().describe("Rupees"),
      notes: z.string().optional(),
    }),
    execute: async ({ client, ...p }) => {
      const r = await resolveClient(client);
      if (!r.client) return { ok: false, kind: "write" as const, error: r.error, matches: r.matches };
      if (r.client.status !== "Won")
        return { ok: false, kind: "write" as const, error: `${r.client.client_code} · ${r.client.name} is ${r.client.status}, not Won. Projects need a Won client — ask whether to mark it Won first.` };
      const s = await saveProject(null, {
        client_id: r.client.id, start_date: todayIST(), priority: "Medium", status: "Not Started", ...p,
      });
      if (!s.ok) return fail(s);
      return done(`Added ${s.code} · ${p.name} for ${r.client.client_code}, due ${fmtDate(p.deadline)}`, `/projects/${s.code}`);
    },
  }),

  updateProject: tool({
    description: "Change an existing project (status, dates, priority, value, notes). Only pass fields that change.",
    inputSchema: z.object({
      project: z.string().describe("Project ID like PR-003 or the project name"),
      changes: z.object({
        name: z.string().optional(),
        start_date: isoDate.optional(),
        deadline: isoDate.optional(),
        priority: z.enum(PRIORITIES).optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
        value: z.number().optional(),
        notes: z.string().optional(),
      }),
    }),
    execute: async ({ project, changes }) => {
      const r = await resolveProject(project);
      if (!r.project) return { ok: false, kind: "write" as const, error: r.error, matches: r.matches };
      const p = r.project;
      const keys = Object.keys(changes);
      if (keys.length === 1 && changes.status) {
        const s = await setProjectStatus(p.id, changes.status);
        if (!s.ok) return fail(s);
        return done(`${p.project_code} · ${p.name} → ${changes.status}`, `/projects/${p.project_code}`);
      }
      const s = await saveProject(p.id, { ...p, ...changes });
      if (!s.ok) return fail(s);
      return done(`Updated ${p.project_code} · ${changes.name ?? p.name}: ${keys.join(", ").replace(/_/g, " ")}`, `/projects/${p.project_code}`);
    },
  }),

  recordPayment: tool({
    description: "Record money received from a client. Date defaults to today and can't be in the future.",
    inputSchema: z.object({
      client: z.string().describe("Client ID or name"),
      amount: z.number().positive().describe("Rupees, e.g. 20k = 20000, 1.2 lakh = 120000"),
      payment_date: isoDate.optional(),
      mode: z.enum(PAYMENT_MODES).optional(),
      notes: z.string().optional(),
    }),
    execute: async ({ client, amount, payment_date, mode, notes }) => {
      const r = await resolveClient(client);
      if (!r.client) return { ok: false, kind: "write" as const, error: r.error, matches: r.matches };
      const s = await savePayment(null, {
        client_id: r.client.id, amount: Math.round(amount * 100) / 100, payment_date: payment_date ?? todayIST(), mode, notes,
      });
      if (!s.ok) return fail(s);
      return done(`Recorded ${s.code} · ${inr(amount)} from ${r.client.client_code} · ${r.client.name}`, `/clients/${r.client.client_code}`);
    },
  }),

  searchPayments: tool({
    description: "List payments, optionally for one client and/or one month, with the total.",
    inputSchema: z.object({
      client: z.string().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("yyyy-MM"),
    }),
    execute: async ({ client, month }) => {
      let clientId: string | undefined;
      if (client) {
        const r = await resolveClient(client);
        if (!r.client) return { ok: false, kind: "read" as const, error: r.error, matches: r.matches };
        clientId = r.client.id;
      }
      const rows = await getPayments({ clientId, month: month ? `${month}-01` : undefined });
      return {
        ok: true,
        kind: "read" as const,
        summary: "Looked up payments",
        total: rows.reduce((s, p) => s + Number(p.amount), 0),
        count: rows.length,
        payments: rows.slice(0, 40).map((p) => ({ code: p.payment_code, date: p.payment_date, client: `${p.clients?.client_code} · ${p.clients?.name}`, amount: Number(p.amount), mode: p.mode })),
      };
    },
  }),

  getIncomeSummary: tool({
    description: "Income totals: this month so far, last month, and every month of a year.",
    inputSchema: z.object({ year: z.number().int().optional() }),
    execute: async ({ year }) => {
      const today = todayIST();
      const y = year ?? Number(today.slice(0, 4));
      const [rows, all] = await Promise.all([getMonthlyIncome(y), getMonthlyIncome()]);
      const thisM = monthStart(today);
      const lastM = addMonths(thisM, -1);
      const get = (m: string) => all.find((r) => r.month === m)?.total ?? 0;
      return {
        ok: true,
        kind: "read" as const,
        summary: "Checked income",
        this_month: { month: monthLabel(thisM), total: get(thisM) },
        last_month: { month: monthLabel(lastM), total: get(lastM) },
        year: y,
        months: rows.map((r) => ({ month: monthLabel(r.month), total: r.total, payments: r.count })),
        year_total: rows.reduce((s, r) => s + r.total, 0),
      };
    },
  }),

  addTodo: tool({
    description: "Add a to-do. Use `when` for Today/Tomorrow/Day after/Later, or `due_date` for a specific date.",
    inputSchema: z.object({
      title: z.string(),
      when: when.optional(),
      due_date: isoDate.optional(),
      priority: z.enum(PRIORITIES).optional(),
      project: z.string().optional().describe("Project ID or name to link"),
      notes: z.string().optional(),
    }),
    execute: async ({ title, when: w, due_date, priority, project, notes }) => {
      const today = todayIST();
      const due = due_date ?? cardDate(w === "day_after" ? "dayafter" : (w ?? "today"), today);
      const r = await quickAddTodo(title, due);
      if (!r.ok || !r.id) return fail(r);
      if (priority || project || notes) {
        let project_id: string | null = null;
        if (project) {
          const p = await resolveProject(project);
          if (p.project) project_id = p.project.id;
        }
        await saveTodo(r.id, { title, due_date: due, priority, project_id, notes, is_done: false });
      }
      const card = cardFor(due, today);
      const label = { today: "Today", tomorrow: "Tomorrow", dayafter: "Day After", later: "Later" }[card];
      return done(`Added to-do “${title}” to ${label}${due && card === "later" ? ` (${fmtDate(due)})` : ""}`, "/todos");
    },
  }),

  listTodos: tool({
    description: "List open to-dos (and ones ticked today) with their card. Use to find a to-do's id before updating it.",
    inputSchema: z.object({ card: z.enum(["today", "tomorrow", "day_after", "later"]).optional() }),
    execute: async ({ card }) => {
      const today = todayIST();
      const rows = await getBoardTodos(today);
      const want = card === "day_after" ? "dayafter" : card;
      return {
        ok: true,
        kind: "read" as const,
        summary: "Looked up to-dos",
        todos: rows
          .filter((t) => !want || cardFor(t.due_date, today) === want)
          .map((t) => ({ id: t.id, title: t.title, card: cardFor(t.due_date, today), due: t.due_date, done: t.is_done, priority: t.priority })),
      };
    },
  }),

  updateTodo: tool({
    description: "Tick off, untick, reschedule or rename a to-do. Get its id from listTodos first.",
    inputSchema: z.object({
      id: z.string(),
      done: z.boolean().optional(),
      when: when.optional(),
      due_date: isoDate.nullable().optional(),
      title: z.string().optional(),
      priority: z.enum(PRIORITIES).nullable().optional(),
    }),
    execute: async ({ id, done: isDone, when: w, due_date, title, priority }) => {
      const { data: t } = await db().from("todos").select("*").eq("id", id).maybeSingle();
      if (!t) return { ok: false, kind: "write" as const, error: "No to-do with that id." };
      const onlyDone = isDone !== undefined && !w && due_date === undefined && !title && priority === undefined;
      if (onlyDone) {
        const r = await toggleTodo(id, isDone!);
        if (!r.ok) return fail(r);
        return done(`${isDone ? "Ticked off" : "Reopened"} “${t.title}”`, "/todos");
      }
      const due = due_date !== undefined ? due_date : w ? cardDate(w === "day_after" ? "dayafter" : w, todayIST()) : t.due_date;
      const r = await saveTodo(id, { ...t, title: title ?? t.title, due_date: due, priority: priority === undefined ? t.priority : priority, is_done: isDone ?? t.is_done });
      if (!r.ok) return fail(r);
      return done(`Updated to-do “${title ?? t.title}”${due !== t.due_date ? ` → ${due ? fmtDate(due) : "Later"}` : ""}`, "/todos");
    },
  }),

  getOverview: tool({
    description: "What needs attention now: projects to start, overdue/due-soon deadlines, today's to-dos and follow-ups.",
    inputSchema: z.object({}),
    execute: async () => {
      const today = todayIST();
      const [tagged, todos, follow] = await Promise.all([
        getProjectsByTag([...TIMELINE_TAGS]),
        getBoardTodos(today),
        getFollowUps(today),
      ]);
      return {
        ok: true,
        kind: "read" as const,
        summary: "Checked what needs attention",
        projects: tagged.map((p) => ({ code: p.project_code, name: p.name, client: p.client_code, tag: p.timeline_tag, start: p.start_date, deadline: p.deadline, days_left: p.days_left })),
        today_todos: todos.filter((t) => cardFor(t.due_date, today) === "today" && !t.is_done).map((t) => ({ id: t.id, title: t.title, due: t.due_date })),
        follow_ups: follow.map((f) => ({ client: `${f.client_code} · ${f.name}`, since: f.follow_up_date })),
      };
    },
  }),
};

function instructions() {
  const today = todayIST();
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date());
  return `You are the assistant inside the owner's client management dashboard. You do the work for them: add and update clients/leads, projects, payments and to-dos, and answer questions about their data.

Today is ${weekday}, ${today} (Asia/Kolkata). Tomorrow is ${addDays(today, 1)}. Resolve relative dates ("next Friday", "end of month", "in 10 days") yourself into yyyy-MM-dd.

How to work:
- When the request is clear, act immediately with the tools. Don't ask for confirmation of simple adds or updates.
- Several things in one message? Do all of them.
- Refer to clients by name or Client ID; the tools resolve them. If a tool says several match or none match, ask a short question.
- Never invent IDs or numbers. Only report what tools returned.
- Money is Indian Rupees. "20k" = 20000, "1.5 lakh" = 150000, "2 cr" = 20000000. Write amounts like ₹1,20,000.
- Projects need a Won client. If the client isn't Won and the user clearly just won it, mark it Won first, then add the project.
- You cannot delete anything. If asked, say they can delete it from the item's page.
- The owner may speak Hinglish or mix Telugu/Hindi with English, and voice transcripts can mishear names — match names loosely via the search tools.

Replies: plain text, no markdown (no **bold**, no headings). Use a simple "- " list only when listing several items. Write dates like 23 Nov 2026, never yyyy-MM-dd. One or two short sentences after actions, mentioning the IDs (e.g. "Done — recorded PY-012 · ₹20,000 from CL-004 Acme."). For questions, answer directly with the numbers.`;
}

export function createDashboardAgent() {
  return new ToolLoopAgent({
    model: vertex()(AGENT_MODEL),
    instructions: instructions(),
    tools,
    stopWhen: isStepCount(12),
  });
}

export type DashboardAgentMessage = InferAgentUIMessage<ReturnType<typeof createDashboardAgent>>;
