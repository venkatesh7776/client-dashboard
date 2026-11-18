"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SECTORS, type SectorKey } from "@/lib/constants";
import { cn, inr } from "@/lib/format";

/** Fills from empty on first paint; skipped when the viewer prefers reduced motion (CSS). */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

const ARC = "transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none";

// ───────────────────────── Main ring: one big donut, spent per sector as slices

export function MainRing({
  total,
  spent,
}: {
  total: number;
  spent: Record<SectorKey, number>;
}) {
  const mounted = useMounted();
  const [active, setActive] = useState<SectorKey | null>(null);
  const size = 240;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const spentTotal = SECTORS.reduce((s, x) => s + spent[x.key], 0);
  const over = spentTotal > total;
  // Over budget: the ring is full and the slices show the mix of what was spent.
  const scale = Math.max(total, spentTotal) || 1;
  const GAP = 2.5;

  let offset = 0;
  const slices = SECTORS.filter((s) => spent[s.key] > 0).map((s) => {
    const len = (spent[s.key] / scale) * C;
    const slice = { ...s, start: offset, len };
    offset += len;
    return slice;
  });
  const gapped = slices.length > 1;

  const a = active ? SECTORS.find((s) => s.key === active)! : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img"
          aria-label={`Spent ${inr(spentTotal)} of ${inr(total)}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
          {slices.map((s) => {
            const visible = gapped ? Math.max(s.len - GAP, 0.5) : s.len;
            return (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.key ? stroke + 4 : stroke}
                strokeDasharray={mounted ? `${visible} ${C - visible}` : `0 ${C}`}
                strokeDashoffset={-s.start}
                className={cn(ARC, "cursor-pointer", active && active !== s.key && "opacity-35")}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${s.label}: ${inr(spent[s.key])}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {a ? (
            <>
              <span className="text-[13px] text-muted">{a.label}</span>
              <span className="tabular mt-0.5 text-[30px] leading-none font-semibold tracking-tight">{inr(spent[a.key])}</span>
              <span className="tabular mt-1.5 text-[13px] text-muted">
                {spentTotal ? Math.round((spent[a.key] / spentTotal) * 100) : 0}% of spending
              </span>
            </>
          ) : (
            <>
              <span className="tabular text-[32px] leading-none font-semibold tracking-tight">{inr(spentTotal)}</span>
              <span className="tabular mt-1.5 text-[14px] text-muted">of {inr(total)}</span>
              <span className={cn("tabular mt-3 text-[13px] font-medium", over ? "text-danger" : "text-muted")}>
                {over ? `Over by ${inr(spentTotal - total)}` : `${inr(total - spentTotal)} left`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* legend — always present so identity never rests on colour alone */}
      <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {SECTORS.map((s) => (
          <li
            key={s.key}
            className="flex cursor-default items-center gap-1.5 text-[13px] text-muted"
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── Sector ring: one small progress ring per sector

export function SectorRing({
  sector,
  budget,
  spent,
  href,
  selected,
}: {
  sector: (typeof SECTORS)[number];
  budget: number;
  spent: number;
  href: string;
  selected?: boolean;
}) {
  const mounted = useMounted();
  const size = 116;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const over = spent > budget;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : spent > 0 ? 1 : 0;
  const len = pct * C;
  const left = budget - spent;

  return (
    <Link
      href={href}
      scroll={false}
      aria-label={`${sector.label}: spent ${inr(spent)} of ${inr(budget)}. Show these expenses`}
      className={cn(
        "group flex flex-col items-center px-3 py-6 transition-colors hover:bg-hover",
        selected && "bg-active hover:bg-active",
      )}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
          {len > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={over ? "var(--danger)" : sector.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={mounted ? `${len} ${C}` : `0 ${C}`}
              className={ARC}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="tabular text-[17px] leading-none font-semibold tracking-tight">{inr(spent)}</span>
          <span className="tabular mt-1 text-[12px] text-muted">of {inr(budget)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[14px] font-medium">
        <span className="size-2 rounded-full" style={{ background: sector.color }} />
        {sector.label}
      </div>
      <div className={cn("tabular mt-0.5 text-[12.5px]", over ? "font-medium text-danger" : "text-faint")}>
        {over ? `Over by ${inr(-left)}` : `${inr(left)} left`}
      </div>
    </Link>
  );
}
