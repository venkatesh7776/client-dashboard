"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthLabel, monthShort } from "@/lib/dates";
import { inr } from "@/lib/format";

const compact = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${Math.round(n / 1e3)}K` : `₹${n}`;

/** Single series, one cool hue: past months in a light blue, the current month in a deeper blue. */
export function IncomeChart({ data, current }: { data: { month: string; total: number }[]; current: string }) {
  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="month"
            tickFormatter={monthShort}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--fg-faint)", fontSize: 11 }}
            interval="preserveStartEnd"
            tickMargin={8}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            width={48}
            tickCount={4}
            tick={{ fill: "var(--fg-faint)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)", radius: 4 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-line bg-bg px-2.5 py-1.5 text-[12.5px] shadow-md">
                  <div className="text-muted">{monthLabel(String(payload[0].payload.month))}</div>
                  <div className="tabular font-medium text-fg">{inr(Number(payload[0].value))}</div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.month === current ? "var(--chart-2)" : "var(--chart-1)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
