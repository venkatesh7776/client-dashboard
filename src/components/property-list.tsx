import type { ReactNode } from "react";

/** Notion-style property rows: muted label on the left, value on the right. */
export function Properties({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(110px,160px)_1fr] gap-y-0.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="flex min-h-8 items-center text-muted">{k}</dt>
          <dd className="flex min-h-8 min-w-0 items-center break-words">{v ?? <span className="text-faint">Empty</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
