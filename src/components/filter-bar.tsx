"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/format";
import type { Option } from "@/lib/types";

type Filter = { key: string; label: string; options: (string | Option)[] };

/** URL-driven search + filters. Keeps everything shareable and server-rendered. */
export function FilterBar({
  search,
  filters = [],
  toggles = [],
  children,
}: {
  search?: string;
  filters?: Filter[];
  toggles?: { key: string; label: string }[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => set("q", q.trim() || null), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      {search !== undefined && (
        <div className="relative w-full sm:w-56">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={search}
            className="h-7 w-full rounded-[5px] border-0 bg-hover pr-2.5 pl-8 text-[14px] outline-none placeholder:text-faint focus:ring-2 focus:ring-[#2383e2]/30"
          />
        </div>
      )}
      {filters.map((f) => {
        const value = params.get(f.key) ?? "";
        return (
          <select
            key={f.key}
            value={value}
            onChange={(e) => set(f.key, e.target.value || null)}
            aria-label={f.label}
            className={cn(
              "h-7 max-w-48 cursor-pointer rounded-[5px] border-0 px-1.5 text-[14px] outline-none",
              value ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-fg)]" : "bg-transparent text-muted hover:bg-hover",
            )}
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => {
              const opt = typeof o === "string" ? { value: o, label: o } : o;
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              );
            })}
          </select>
        );
      })}
      {toggles.map((t) => {
        const on = params.get(t.key) === "1";
        return (
          <label key={t.key} className="flex h-7 cursor-pointer items-center gap-2 rounded-[5px] px-1.5 text-[14px] text-muted hover:bg-hover">
            <input type="checkbox" checked={on} onChange={() => set(t.key, on ? null : "1")} className="accent-[var(--accent)]" />
            {t.label}
          </label>
        );
      })}
      {children}
    </div>
  );
}
