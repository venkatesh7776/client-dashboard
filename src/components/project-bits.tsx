import { Pill } from "@/components/ui";
import { cn } from "@/lib/format";

export function TimelineTag({ tag }: { tag: string | null }) {
  if (!tag) return <span className="text-faint">—</span>;
  return <Pill>{tag}</Pill>;
}

export function DaysLeft({ days, status }: { days: number; status?: string }) {
  if (status === "Completed" || status === "Cancelled") return <span className="text-faint">—</span>;
  return (
    <span className={cn("tabular", days < 0 ? "text-danger" : days <= 7 ? "text-fg" : "text-muted")}>
      {days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : `${days}d`}
    </span>
  );
}
