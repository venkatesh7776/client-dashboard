"use server";

import { revalidatePath } from "next/cache";
import { ensureStartTodos } from "@/lib/auto-todos";
import { todayIST } from "@/lib/dates";
import { db } from "@/lib/supabase";
import { clientSchema, paymentSchema, parseForm, projectSchema, todoSchema, type FieldErrors } from "@/lib/schemas";
import { CLIENT_STATUSES, PROJECT_CLIENT_STATUSES, PROJECT_STATUSES } from "@/lib/constants";

export type ActionResult = {
  ok: boolean;
  error?: string;
  errors?: FieldErrors;
  id?: string;
  code?: string;
  label?: string;
  becameWon?: boolean;
  projectCode?: string;
  suggestLost?: boolean;
  delivered?: { client: string; projects: string[] };
};

function refresh() {
  revalidatePath("/", "layout");
}

function fail(e: unknown): ActionResult {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
  if (msg.includes("deadline_after_start")) return { ok: false, errors: { deadline: "Deadline can't be before the start date" } };
  return { ok: false, error: msg };
}

// ───────────────────────── Clients

/** When a client becomes Closed and has no project yet, create one (no dates) so it can be filled in later. */
async function ensureWonProject(clientId: string, clientName: string): Promise<{ code: string } | null> {
  const { count } = await db().from("projects").select("id", { count: "exact", head: true }).eq("client_id", clientId);
  if ((count ?? 0) > 0) return null;
  const { data, error } = await db()
    .from("projects")
    .insert({ client_id: clientId, name: clientName.slice(0, 120), priority: "Medium", status: "Not Started" })
    .select("project_code")
    .single();
  if (error) throw error;
  return { code: data.project_code };
}

export async function saveClient(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = parseForm(clientSchema, input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const data = { ...parsed.data, lost_reason: parsed.data.status === "Lost" ? parsed.data.lost_reason : null };
  try {
    let before: { status: string } | null = null;
    if (id) before = (await db().from("clients").select("status").eq("id", id).single()).data;
    const q = id ? db().from("clients").update(data).eq("id", id) : db().from("clients").insert(data);
    const { data: row, error } = await q.select("id, client_code, name").single();
    if (error) throw error;
    const becameWon = data.status === "Closed" && before?.status !== "Closed" && before?.status !== "Delivered";
    const project = becameWon ? await ensureWonProject(row.id, row.name) : null;
    const delivered = await settleIfFullyPaid(row.id);
    refresh();
    return { ok: true, id: row.id, code: row.client_code, label: `${row.client_code} · ${row.name}`, becameWon, projectCode: project?.code, delivered };
  } catch (e) {
    return fail(e);
  }
}

export async function setClientStatus(id: string, status: string): Promise<ActionResult> {
  if (!(CLIENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
  try {
    const { data: before } = await db().from("clients").select("status").eq("id", id).single();
    const { data: row, error } = await db().from("clients").update({ status }).eq("id", id).select("id, client_code, name").single();
    if (error) throw error;
    const becameWon = status === "Closed" && before?.status !== "Closed" && before?.status !== "Delivered";
    const project = becameWon ? await ensureWonProject(row.id, row.name) : null;
    refresh();
    return { ok: true, id: row.id, code: row.client_code, label: `${row.client_code} · ${row.name}`, becameWon, projectCode: project?.code };
  } catch (e) {
    return fail(e);
  }
}

/** What deleting this client would also remove — shown in the confirm dialog. */
export async function getClientDeleteImpact(id: string) {
  const [{ count: projects }, { data: pays }] = await Promise.all([
    db().from("projects").select("id", { count: "exact", head: true }).eq("client_id", id),
    db().from("payments").select("amount").eq("client_id", id),
  ]);
  return {
    projects: projects ?? 0,
    payments: pays?.length ?? 0,
    paymentsTotal: (pays ?? []).reduce((s, p) => s + Number(p.amount), 0),
  };
}

/** Deletes the client together with its projects (and their files) and payments. */
export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const { data: projects } = await db().from("projects").select("id").eq("client_id", id);
    for (const p of projects ?? []) await removeProjectFiles(p.id);
    const steps = [
      db().from("payments").delete().eq("client_id", id),
      db().from("projects").delete().eq("client_id", id),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw error;
    }
    const { error } = await db().from("clients").delete().eq("id", id);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── Auto-delivery

/**
 * When everything a Closed client owes has been received, mark the client Delivered and its
 * open projects Completed. "Owes" = total value of its non-cancelled projects, or — when no
 * project has a value — the client's expected value.
 */
async function settleIfFullyPaid(clientId: string): Promise<ActionResult["delivered"]> {
  const [{ data: c }, { data: projects }, { data: pays }] = await Promise.all([
    db().from("clients").select("client_code, name, status, expected_value").eq("id", clientId).single(),
    db().from("projects").select("id, project_code, status, value").eq("client_id", clientId),
    db().from("payments").select("amount").eq("client_id", clientId),
  ]);
  if (!c || c.status !== "Closed") return undefined;
  const active = (projects ?? []).filter((p) => p.status !== "Cancelled");
  const projectTotal = active.reduce((s, p) => s + Number(p.value ?? 0), 0);
  const target = projectTotal > 0 ? projectTotal : Number(c.expected_value ?? 0);
  if (target <= 0) return undefined;
  const received = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  if (received + 0.005 < target) return undefined;

  await db().from("clients").update({ status: "Delivered" }).eq("id", clientId);
  const toComplete = active.filter((p) => p.status !== "Completed");
  if (toComplete.length) await db().from("projects").update({ status: "Completed" }).in("id", toComplete.map((p) => p.id));
  return { client: `${c.client_code} · ${c.name}`, projects: toComplete.map((p) => p.project_code) };
}

// ───────────────────────── Projects

export async function saveProject(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = parseForm(projectSchema, input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  try {
    // Only Closed/Delivered clients can get new projects (an existing project may keep its client).
    let mustBeWon = !id;
    if (id) {
      const { data: cur } = await db().from("projects").select("client_id").eq("id", id).single();
      mustBeWon = cur?.client_id !== parsed.data.client_id;
    }
    if (mustBeWon) {
      const { data: c } = await db().from("clients").select("status").eq("id", parsed.data.client_id).single();
      if (!PROJECT_CLIENT_STATUSES.includes(c?.status ?? "")) return { ok: false, errors: { client_id: "Only Closed or Delivered clients can have projects" } };
    }
    const q = id
      ? db().from("projects").update(parsed.data).eq("id", id)
      : db().from("projects").insert(parsed.data);
    const { data: row, error } = await q.select("id, project_code").single();
    if (error) throw error;
    if (parsed.data.start_date === todayIST()) await ensureStartTodos(todayIST(), row.id);
    const delivered = await settleIfFullyPaid(parsed.data.client_id);
    refresh();
    return { ok: true, id: row.id, code: row.project_code, delivered };
  } catch (e) {
    return fail(e);
  }
}

export async function setProjectStatus(id: string, status: string): Promise<ActionResult> {
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
  const { error } = await db().from("projects").update({ status }).eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await removeProjectFiles(id);
  const { error } = await db().from("projects").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ───────────────────────── Payments

export async function savePayment(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = parseForm(paymentSchema, input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  try {
    const { data: c } = await db().from("clients").select("status").eq("id", parsed.data.client_id).single();
    if (!c) return { ok: false, errors: { client_id: "Select a client" } };
    if (c.status === "Lost") return { ok: false, errors: { client_id: "Payments can't be added to a Lost client" } };
    const q = id
      ? db().from("payments").update(parsed.data).eq("id", id)
      : db().from("payments").insert(parsed.data);
    const { data: row, error } = await q.select("id, payment_code").single();
    if (error) throw error;
    const delivered = await settleIfFullyPaid(parsed.data.client_id);
    refresh();
    return { ok: true, id: row.id, code: row.payment_code, delivered };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const { error } = await db().from("payments").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ───────────────────────── To-dos

export async function quickAddTodo(title: string, due_date: string | null): Promise<ActionResult> {
  const parsed = parseForm(todoSchema, { title, due_date, is_done: false });
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const { data: last } = await db()
    .from("todos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: row, error } = await db()
    .from("todos")
    .insert({ ...parsed.data, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return fail(error);
  refresh();
  return { ok: true, id: row.id };
}

export async function saveTodo(id: string, input: unknown): Promise<ActionResult> {
  const parsed = parseForm(todoSchema, input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const { data: cur } = await db().from("todos").select("is_done, done_at").eq("id", id).single();
  const done_at = parsed.data.is_done ? (cur?.is_done ? cur.done_at : new Date().toISOString()) : null;
  const { error } = await db().from("todos").update({ ...parsed.data, done_at }).eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true, id };
}

export async function toggleTodo(id: string, done: boolean): Promise<ActionResult> {
  const { error } = await db()
    .from("todos")
    .update({ is_done: done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  const { error } = await db().from("todos").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

/** Saves a card's order; if an item moved in from another card, sets its due date. */
export async function reorderTodos(
  orderedIds: string[],
  moved?: { id: string; due_date: string | null },
): Promise<ActionResult> {
  try {
    if (moved) {
      const { error } = await db().from("todos").update({ due_date: moved.due_date }).eq("id", moved.id);
      if (error) throw error;
    }
    const results = await Promise.all(
      orderedIds.map((id, i) => db().from("todos").update({ sort_order: i + 1 }).eq("id", id)),
    );
    const err = results.find((r) => r.error)?.error;
    if (err) throw err;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── Project files (Supabase Storage, private bucket)

const BUCKET = "project-files";

async function removeProjectFiles(projectId: string) {
  const { data } = await db().from("project_files").select("path").eq("project_id", projectId);
  const paths = (data ?? []).map((f) => f.path);
  if (paths.length) await db().storage.from(BUCKET).remove(paths);
}

/** Returns a one-time signed URL the browser can upload one file to (no database key leaves the server). */
export async function createProjectUpload(projectId: string, fileName: string): Promise<{ ok: boolean; error?: string; url?: string; path?: string }> {
  const safe = fileName.replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";
  const path = `${projectId}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? "Could not start upload" };
  return { ok: true, url: data.signedUrl, path };
}

export async function registerProjectFile(projectId: string, f: { path: string; name: string; size: number; mime: string }): Promise<ActionResult> {
  if (!f.path.startsWith(`${projectId}/`)) return { ok: false, error: "Invalid file" };
  const { error } = await db().from("project_files").insert({ project_id: projectId, path: f.path, name: f.name.slice(0, 200), size: f.size, mime: f.mime || null });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function getProjectFileUrl(id: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { data: f } = await db().from("project_files").select("path, name").eq("id", id).single();
  if (!f) return { ok: false, error: "File not found" };
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(f.path, 120, { download: f.name });
  if (error || !data) return { ok: false, error: error?.message ?? "Could not open file" };
  return { ok: true, url: data.signedUrl };
}

export async function deleteProjectFile(id: string): Promise<ActionResult> {
  const { data: f } = await db().from("project_files").select("path").eq("id", id).single();
  if (f) await db().storage.from(BUCKET).remove([f.path]);
  const { error } = await db().from("project_files").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

/** Inline edit of a single project field from a list or property panel. */
export async function updateProjectField(
  id: string,
  patch: Partial<{ start_date: string | null; deadline: string | null; priority: string; value: number | null }>,
): Promise<ActionResult> {
  const { data: cur, error } = await db().from("projects").select("client_id, name, start_date, deadline, priority, status, value, notes").eq("id", id).single();
  if (error || !cur) return { ok: false, error: "Project not found" };
  return saveProject(id, { ...cur, ...patch });
}
