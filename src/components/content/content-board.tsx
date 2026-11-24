"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { quickAddContent, setContentStatus } from "@/app/actions";
import { notify } from "@/components/toast";
import { Pill } from "@/components/ui";
import { CONTENT_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { cn, reelLength } from "@/lib/format";
import type { Content } from "@/lib/types";

// ───────────────────────── Quick capture

/** Type an idea, press Enter — saved as an Idea without leaving the page. */
export function QuickIdea() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function submit() {
    const t = title.trim();
    if (!t || pending) return;
    setError(null);
    start(async () => {
      const r = await quickAddContent(t);
      if (r.ok) {
        setTitle("");
        notify("Idea saved.", { href: `/content/${r.code}`, label: "Open" });
        input.current?.focus();
      } else setError(r.errors?.title ?? r.error ?? "Couldn't save");
    });
  }

  return (
    <div className="mb-5">
      <div className="card flex items-center gap-2.5 px-4 transition-shadow focus-within:ring-2 focus-within:ring-[#2383e2]/20">
        <Lightbulb size={17} className="shrink-0 text-faint" />
        <input
          ref={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={200}
          placeholder="Got an idea? Type it and press Enter"
          aria-label="New content idea"
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
        />
        {title.trim() && (
          <button onClick={submit} disabled={pending} className="shrink-0 text-[13px] font-medium text-muted hover:text-fg">
            {pending ? "Saving…" : "Save ↵"}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

// ───────────────────────── Board

export function ContentBoard({ items: initial }: { items: Content[] }) {
  const [items, setItems] = useState(initial);
  const [active, setActive] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setItems(initial), [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const id = String(e.active.id);
    const status = e.over ? String(e.over.id) : null;
    const c = items.find((x) => x.id === id);
    if (!c || !status || c.status === status) return;
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    setError(null);
    start(async () => {
      const r = await setContentStatus(id, status);
      if (!r.ok) {
        setItems(prev);
        setError(r.error ?? "Could not move it");
      }
    });
  }

  return (
    <>
      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
      <DndContext
        id="content-board"
        sensors={sensors}
        onDragStart={(e) => setActive(items.find((x) => x.id === e.active.id) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {CONTENT_STATUSES.map((status) => {
            const col = items.filter((c) => c.status === status);
            return (
              <Column key={status} status={status} count={col.length}>
                {col.map((c) => (
                  <Card key={c.id} item={c} />
                ))}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{active ? <CardBody item={active} dragging /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}

function Column({ status, count, children }: { status: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn("flex min-w-[176px] flex-1 flex-col rounded-lg p-1.5 transition-colors", isOver ? "bg-active" : "bg-[var(--column)]")}>
      <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
        <Pill>{status}</Pill>
        <span className="text-[13px] text-faint">{count}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Card({ item }: { item: Content }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-30")}>
      <CardBody item={item} />
    </div>
  );
}

function CardBody({ item: c, dragging }: { item: Content; dragging?: boolean }) {
  const len = reelLength(c.script);
  const date = c.planned_date && `Post ${fmtDate(c.planned_date)}`;
  return (
    <Link
      href={`/content/${c.content_code}`}
      draggable={false}
      className={cn(
        "block cursor-grab rounded-lg border border-line bg-bg p-3 shadow-[var(--card-shadow)] transition-colors hover:border-line-strong active:cursor-grabbing",
        dragging && "rotate-1 shadow-lg",
      )}
    >
      <div className="line-clamp-3 text-sm leading-snug font-medium">{c.title}</div>
      {(c.pillar || len || date) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
          {c.pillar && <Pill tone="gray">{c.pillar}</Pill>}
          {len && <span className="tabular">{len.label}</span>}
          {date && <span className="tabular">{date}</span>}
        </div>
      )}
    </Link>
  );
}
