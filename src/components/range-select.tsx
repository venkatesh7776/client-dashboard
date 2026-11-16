"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/format";

export function RangeSelect({
  value,
  groups,
}: {
  value: string;
  groups: { group: string; items: { key: string; label: string }[] }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Revenue period"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value === "this_month") next.delete("income");
        else next.set("income", e.target.value);
        start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
      }}
      className={cn(
        "h-7 max-w-[240px] cursor-pointer rounded-[5px] border-0 bg-transparent px-1.5 text-[14px] text-muted outline-none hover:bg-hover hover:text-fg",
        pending && "opacity-60",
      )}
    >
      {groups.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.items.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
