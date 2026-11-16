import { addDays } from "./dates";
import type { Todo } from "./types";

/** Two cards: Today (due today or earlier — overdue items roll in automatically) and Later (everything else). */
export const CARDS = ["today", "later"] as const;
export type CardKey = (typeof CARDS)[number];

export const CARD_LABEL: Record<CardKey, string> = {
  today: "Today",
  later: "Later",
};

export function cardFor(due: string | null, today: string): CardKey {
  return due && due <= today ? "today" : "later";
}

/** Date a card assigns when an item is dropped/added there (Later = undated unless one is picked). */
export function cardDate(card: CardKey, today: string): string | null {
  return card === "today" ? today : null;
}

/** For the agent and quick phrases: "today" | "tomorrow" | "day_after" | "later". */
export function whenDate(when: "today" | "tomorrow" | "day_after" | "later", today: string): string | null {
  if (when === "today") return today;
  if (when === "tomorrow") return addDays(today, 1);
  if (when === "day_after") return addDays(today, 2);
  return null;
}

/** Later is ordered by date (soonest first), undated items last in their saved order. */
export function groupTodos(todos: Todo[], today: string): Record<CardKey, Todo[]> {
  const out: Record<CardKey, Todo[]> = { today: [], later: [] };
  for (const t of todos) out[cardFor(t.due_date, today)].push(t);
  out.later.sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31") || a.sort_order - b.sort_order);
  return out;
}

/** "Tomorrow", "Wed, 18 Nov", or "" for undated. */
export function laterLabel(due: string | null, today: string): string {
  if (!due) return "";
  if (due === addDays(today, 1)) return "Tomorrow";
  const d = new Date(due + "T00:00:00Z");
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${WD[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")} ${MO[d.getUTCMonth()]}`;
}
