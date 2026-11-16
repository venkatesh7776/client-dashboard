"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function YearSelect({ year, years }: { year: number; years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Year"
      value={year}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("year", e.target.value);
        router.replace(`${pathname}?${next}`, { scroll: false });
      }}
      className="h-7 cursor-pointer rounded-md border border-line bg-bg px-2 text-[13px] font-medium outline-none hover:bg-hover"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
