"use client";

import { useState, useTransition } from "react";
import { setProjectStatus } from "@/app/actions";
import { PROJECT_STATUSES, TONE } from "@/lib/constants";

/** Quick status change from the list (PR-7) — looks like a pill, behaves like a select. */
export function ProjectStatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const tone = TONE[value] ?? "gray";
  return (
    <select
      aria-label="Project status"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const prev = value;
        setValue(next);
        start(async () => {
          const r = await setProjectStatus(id, next);
          if (!r.ok) setValue(prev);
        });
      }}
      className="cursor-pointer appearance-none rounded-[4px] border-0 px-1.5 py-px text-[12.5px] leading-[20px] outline-none focus-visible:ring-2 focus-visible:ring-[#2383e2]/40"
      style={{ background: `var(--tag-${tone}-bg)`, color: `var(--tag-${tone}-fg)` }}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-bg text-fg">
          {s}
        </option>
      ))}
    </select>
  );
}
