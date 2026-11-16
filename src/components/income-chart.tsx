"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthLabel, monthShort } from "@/lib/dates";
import { inr } from "@/lib/format";

const compact = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${Math.round(n / 1e3)}K` : `₹${n}`;

export function IncomeChart({ data, current }: { data: { month: string; total: number }[]; current: string }) {
  return (
    <div className="h-56 w-full px-2 pt-4 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickFormatter={monthShort}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-line bg-bg px-2.5 py-1.5 text-[12.5px] shadow-md">
                  <div className="text-muted">{monthLabel(String(payload[0].payload.month))}</div>
                  <div className="tabular font-medium">{inr(Number(payload[0].value))}</div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fill="var(--chart)" fillOpacity={d.month === current ? 0.45 : 0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
