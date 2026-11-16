import "server-only";
import type { UIMessage } from "ai";
import { db } from "@/lib/supabase";

export type ChatStatus = "idle" | "running" | "error";
export type ChatSummary = { id: string; title: string; status: ChatStatus; updated_at: string };

/** A run that hasn't saved anything for this long is treated as finished (e.g. the server was stopped). */
const STALE_MS = 6 * 60 * 1000;

function effectiveStatus(status: ChatStatus, updatedAt: string): ChatStatus {
  return status === "running" && Date.now() - Date.parse(updatedAt) > STALE_MS ? "error" : status;
}

export async function listChats(limit = 40): Promise<ChatSummary[]> {
  const { data, error } = await db()
    .from("agent_chats")
    .select("id, title, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ ...c, status: effectiveStatus(c.status, c.updated_at) }));
}

export async function getChat(id: string) {
  const { data, error } = await db().from("agent_chats").select("id, title, status, messages, updated_at").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, status: effectiveStatus(data.status, data.updated_at), messages: data.messages as UIMessage[] };
}

export async function saveChat(id: string, patch: { messages?: unknown[]; status?: ChatStatus; title?: string }) {
  const { error } = await db().from("agent_chats").upsert({ id, ...patch }, { onConflict: "id" });
  if (error) console.error("saveChat failed", error.message);
}

export async function deleteChat(id: string) {
  await db().from("agent_chats").delete().eq("id", id);
}

/** First user sentence, trimmed — used as the chat's name in the history list. */
export function titleFrom(message: Pick<UIMessage, "parts">): string {
  const text = message.parts.map((p) => (p.type === "text" ? (p as { text: string }).text : "")).join(" ").replace(/\s+/g, " ").trim();
  return text.length > 60 ? text.slice(0, 57) + "…" : text || "New chat";
}
