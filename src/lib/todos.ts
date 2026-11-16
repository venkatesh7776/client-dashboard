import { addDays } from "./dates";
import type { Todo } from "./types";

export const CARDS = ["today", "tomorrow", "dayafter", "later"] as const;
export type CardKey = (typeof CARDS)[number];

export const CARD_LABEL: Record<CardKey, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  dayafter: "Day After",
  later: "Later",
};

/** PRD §9 placement rule. */
export function cardFor(due: string | null, today: string): CardKey {
  if (!due) return "later";
  if (due <= today) return "today";
  if (due === addDays(today, 1)) return "tomorrow";
  if (due === addDays(today, 2)) return "dayafter";
  return "later";
}

/** Date a card assigns when an item is dropped/added there. */
export function cardDate(card: CardKey, today: string): string | null {
  if (card === "today") return today;
  if (card === "tomorrow") return addDays(today, 1);
  if (card === "dayafter") return addDays(today, 2);
  return null;
}

export function groupTodos(todos: Todo[], today: string): Record<CardKey, Todo[]> {
  const out: Record<CardKey, Todo[]> = { today: [], tomorrow: [], dayafter: [], later: [] };
  for (const t of todos) out[cardFor(t.due_date, today)].push(t);
  return out;
}
