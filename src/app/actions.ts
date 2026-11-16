"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { clientSchema, paymentSchema, parseForm, projectSchema, todoSchema, type FieldErrors } from "@/lib/schemas";
import { PROJECT_STATUSES, CLIENT_STATUSES } from "@/lib/constants";

export type ActionResult = {
  ok: boolean;
  error?: string;
  errors?: FieldErrors;
  id?: string;
  code?: string;
  label?: string;
  becameWon?: boolean;
  suggestLost?: boolean;
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

export async function saveClient(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = parseForm(clientSchema, input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const data = { ...parsed.data, lost_reason: parsed.data.status === "Lost" ? parsed.data.lost_reason : null };
  try {
    if (id) {
      const { data: before } = await db().from("clients").select("status").eq("id", id).single();
      const { data: row, error } = await db().from("clients").update(data).eq("id", id).select("id, client_code, name").single();
      if (error) throw error;
      refresh();
      return { ok: true, id: row.id, code: row.client_code, label: `${row.client_code} · ${row.name}`, becameWon: data.status === "Won" && before?.status !== "Won" };
    }
    const { data: row, error } = await db().from("clients").insert(data).select("id, client_code, name").single();
    if (error) throw error;
    refresh();
    return { ok: true, id: row.id, code: row.client_code, label: `${row.client_code} · ${row.name}`, becameWon: data.status === "Won" };
  } catch (e) {
    return fail(e);
  }
}

export async function setClientStatus(id: string, status: string): Promise<ActionResult> {
  if (!(CLIENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
  const { data: row, error } = await db().from("clients").update({ status }).eq("id", id).select("id, client_code, name").single();
  if (error) return fail(error);
  refresh();
  return { ok: true, id: row.id, code: row.client_code, label: `${row.client_code} · ${row.name}`, becameWon: status === "Won" };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const [{ count: projects }, { count: payments }] = await Promise.all([
    db().from("projects").select("id", { count: "exact", head: true }).eq("client_id", id),
    db().from("payments").select("id", { count: "exact", head: true }).eq("client_id", id),
  ]);
  if ((projects ?? 0) > 0 || (payments ?? 0) > 0) {
    return {
      ok: false,
      suggestLost: true,
      error: "This client has projects or payments, so it can't be deleted. Mark it as Lost instead.",
    };
  }
  const { error } = await db().from("clients").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ───────────────────────── Projects

export async function saveProject(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = parseForm(projectSchema, input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  try {
    // Only Won clients can get new projects (an existing project may keep its client).
    let mustBeWon = !id;
    if (id) {
      const { data: cur } = await db().from("projects").select("client_id").eq("id", id).single();
      mustBeWon = cur?.client_id !== parsed.data.client_id;
    }
    if (mustBeWon) {
      const { data: c } = await db().from("clients").select("status").eq("id", parsed.data.client_id).single();
      if (c?.status !== "Won") return { ok: false, errors: { client_id: "Only Won clients can have projects" } };
    }
    const q = id
      ? db().from("projects").update(parsed.data).eq("id", id)
      : db().from("projects").insert(parsed.data);
    const { data: row, error } = await q.select("id, project_code").single();
    if (error) throw error;
    refresh();
    return { ok: true, id: row.id, code: row.project_code };
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
    refresh();
    return { ok: true, id: row.id, code: row.payment_code };
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
