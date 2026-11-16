import { Columns3, Table2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/format";

/** Board / Table switch, kept in the URL (?view=). */
export function ViewTabs({ base, view, params }: { base: string; view: "board" | "table"; params: Record<string, string | undefined> }) {
  const href = (v: string) => {
    const p = new URLSearchParams(Object.entries(params).filter(([, x]) => x !== undefined) as [string, string][]);
    p.set("view", v);
    return `${base}?${p}`;
  };
  return (
    <div className="mb-3 flex items-center gap-1 border-b border-line">
      {[
        { v: "board", label: "Board", icon: Columns3 },
        { v: "table", label: "Table", icon: Table2 },
      ].map(({ v, label, icon: Icon }) => (
        <Link
          key={v}
          href={href(v)}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 px-2 pb-2 text-sm",
            view === v ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg",
          )}
        >
          <Icon size={15} /> {label}
        </Link>
      ))}
    </div>
  );
}
