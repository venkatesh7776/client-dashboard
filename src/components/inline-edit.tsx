"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateProjectField } from "@/app/actions";
import { PRIORITIES, TONE } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/format";

/** Click to pick a date; saves immediately. Clearing the picker removes the date. */
export function InlineProjectDate({
  id,
  field,
  value,
  min,
  max,
  className,
}: {
  id: string;
  field: "start_date" | "deadline";
  value: string | null;
  min?: string | null;
  max?: string | null;
  className?: string;
}) {
  const [v, setV] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setV(value), [value]);

  function save(next: string | null) {
    if (next === v) return;
    const prev = v;
    setV(next);
    setError(null);
    start(async () => {
      const r = await updateProjectField(id, { [field]: next });
      if (!r.ok) {
        setV(prev);
        setError(r.errors?.[field] ?? r.errors?.deadline ?? r.error ?? "Couldn't save");
      }
    });
  }

  const label = field === "deadline" ? "deadline" : "start date";
  return (
    <span className="relative inline-flex flex-col">
      <button
        type="button"
        onClick={() => {
          const el = input.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
          }
        }}
        title={`Change ${label}`}
        className={cn(
          "tabular -mx-1.5 rounded px-1.5 py-0.5 text-left whitespace-nowrap transition-colors hover:bg-active",
          pending && "opacity-60",
          className,
        )}
      >
        {v ? fmtDate(v) : <span className="text-faint">Add {label}</span>}
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-label={`Set ${label}`}
        value={v ?? ""}
        min={min ?? undefined}
        max={max ?? undefined}
        onChange={(e) => save(e.target.value || null)}
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
      />
      {error && <span className="absolute top-full left-0 z-10 mt-0.5 rounded bg-bg px-1 text-[11.5px] whitespace-nowrap text-danger shadow-sm">{error}</span>}
    </span>
  );
}

/** Priority as a dot + label that is really a select. */
export function InlineProjectPriority({ id, value }: { id: string; value: string }) {
  const [v, setV] = useState(value);
  const [pending, start] = useTransition();
  useEffect(() => setV(value), [value]);
  const tone = TONE[v] ?? "gray";
  return (
    <span className={cn("relative -mx-1.5 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-active", pending && "opacity-60")}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: `var(--tag-${tone}-fg)` }} />
      <select
        aria-label="Priority"
        value={v}
        onChange={(e) => {
          const next = e.target.value;
          const prev = v;
          setV(next);
          start(async () => {
            const r = await updateProjectField(id, { priority: next });
            if (!r.ok) setV(prev);
          });
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-sm text-fg outline-none"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p} className="bg-bg">
            {p}
          </option>
        ))}
      </select>
    </span>
  );
}
