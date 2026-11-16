"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toggleTodo } from "@/app/actions";
import { Pill, PriorityDot } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { Todo } from "@/lib/types";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[3px] border transition-colors",
        checked ? "border-[#2383e2] bg-[#2383e2] text-white" : "border-line-strong hover:bg-hover",
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

export function TodoRow({
  todo,
  today,
  onToggle,
  onOpen,
  showDate,
  chip,
}: {
  todo: Todo;
  today: string;
  chip?: string;
  onToggle: (done: boolean) => void;
  onOpen?: () => void;
  showDate?: boolean;
}) {
  const overdue = !todo.is_done && todo.due_date && todo.due_date < today;
  return (
    <div
      onClick={onOpen}
      className={cn("group flex min-h-8 items-start gap-2.5 rounded-md px-2 py-1.5", onOpen && "cursor-pointer hover:bg-hover")}
    >
      <div className="pt-0.5">
        <Checkbox checked={todo.is_done} onChange={onToggle} label={`Mark "${todo.title}" ${todo.is_done ? "not done" : "done"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm leading-snug break-words", todo.is_done && "text-faint line-through")}>
          {todo.priority && (
            <span className="mr-1.5 inline-flex -translate-y-px align-middle">
              <PriorityDot priority={todo.priority} />
            </span>
          )}
          {todo.title}
        </div>
        {(overdue || todo.projects || (showDate && todo.due_date) || chip) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
            {chip && <span className="tabular rounded bg-hover px-1.5 py-px text-[11.5px] text-muted">{chip}</span>}
            {overdue && <Pill tone="red">Overdue · {fmtDate(todo.due_date)}</Pill>}
            {showDate && !overdue && todo.due_date && <span className="tabular">{fmtDate(todo.due_date)}</span>}
            {todo.projects && <span className="truncate">{todo.projects.project_code} · {todo.projects.name}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple tickable list; ticking here updates the board too (same rows). */
export function TodoList({ todos, today, showDate = true }: { todos: Todo[]; today: string; showDate?: boolean }) {
  const [items, setItems] = useState(todos);
  const [, start] = useTransition();
  useEffect(() => setItems(todos), [todos]);
  return (
    <div className="p-1.5">
      {items.map((t) => (
        <TodoRow
          key={t.id}
          todo={t}
          today={today}
          showDate={showDate}
          onToggle={(done) => {
            setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, is_done: done } : x)));
            start(async () => {
              const r = await toggleTodo(t.id, done);
              if (!r.ok) setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, is_done: !done } : x)));
            });
          }}
        />
      ))}
    </div>
  );
}
