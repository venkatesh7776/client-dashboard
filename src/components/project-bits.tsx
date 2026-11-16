import { Pill } from "@/components/ui";
import { cn } from "@/lib/format";

export function TimelineTag({ tag, noDeadline }: { tag: string | null; noDeadline?: boolean }) {
  if (tag) return <Pill>{tag}</Pill>;
  if (noDeadline) return <Pill tone="gray">No deadline</Pill>;
  return <span className="text-faint">—</span>;
}

export function DaysLeft({ days, status }: { days: number | null; status?: string }) {
  if (days === null || status === "Completed" || status === "Cancelled") return <span className="text-faint">—</span>;
  return (
    <span className={cn("tabular", days < 0 ? "text-danger" : days <= 7 ? "text-fg" : "text-muted")}>
      {days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : `${days}d`}
    </span>
  );
}
