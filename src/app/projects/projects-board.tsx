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
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { setProjectStatus } from "@/app/actions";
import { TimelineTag } from "@/components/project-bits";
import { Pill, PriorityDot } from "@/components/ui";
import { PROJECT_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { Project } from "@/lib/types";

const CLOSED = ["Completed", "Cancelled"];

export function ProjectsBoard({ projects, showClosed }: { projects: Project[]; showClosed: boolean }) {
  const [items, setItems] = useState(projects);
  const [active, setActive] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setItems(projects), [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const id = String(e.active.id);
    const status = e.over ? String(e.over.id) : null;
    const p = items.find((x) => x.id === id);
    if (!p || !status || p.status === status) return;
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    setError(null);
    start(async () => {
      const r = await setProjectStatus(id, status);
      if (!r.ok) {
        setItems(prev);
        setError(r.error ?? "Could not update status");
      }
    });
  }

  return (
    <>
      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
      <DndContext
        id="projects-board"
        sensors={sensors}
        onDragStart={(e) => setActive(items.find((x) => x.id === e.active.id) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {PROJECT_STATUSES.map((status) => {
            const col = items.filter((p) => p.status === status);
            const hidden = CLOSED.includes(status) && !showClosed;
            return (
              <Column key={status} status={status} count={hidden ? null : col.length}>
                {hidden ? (
                  <p className="px-1 py-3 text-[13px] text-faint">Hidden. Drop a card here to mark it {status}.</p>
                ) : (
                  col.map((p) => <Card key={p.id} project={p} />)
                )}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{active ? <CardBody project={active} dragging /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}

function Column({ status, count, children }: { status: string; count: number | null; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn("flex min-w-[210px] flex-1 flex-col rounded-lg p-1.5 transition-colors", isOver ? "bg-active" : "bg-[var(--column)]")}>
      <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
        <Pill>{status}</Pill>
        {count !== null && <span className="text-[13px] text-faint">{count}</span>}
      </div>
      <div className="flex min-h-16 flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Card({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: project.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-30")}>
      <CardBody project={project} />
    </div>
  );
}

function CardBody({ project: p, dragging }: { project: Project; dragging?: boolean }) {
  const open = !CLOSED.includes(p.status) && p.status !== "On Hold";
  return (
    <Link
      href={`/projects/${p.project_code}`}
      draggable={false}
      className={cn(
        "block cursor-grab rounded-lg border border-line bg-bg p-3 shadow-[var(--card-shadow)] transition-colors hover:border-line-strong active:cursor-grabbing",
        dragging && "rotate-1 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="pt-1.5">
          <PriorityDot priority={p.priority} />
        </span>
        <div className="min-w-0 text-sm leading-snug font-medium">{p.name}</div>
      </div>
      <div className="mt-1 truncate text-[12.5px] text-muted">
        <span className="tabular">{p.client_code}</span> · {p.client_name}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        <span className="tabular">{p.deadline ? `Due ${fmtDate(p.deadline)}` : ""}</span>
        {open && (p.timeline_tag || !p.deadline) && <TimelineTag tag={p.timeline_tag} noDeadline={!p.deadline} />}
      </div>
    </Link>
  );
}
