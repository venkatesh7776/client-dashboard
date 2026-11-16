"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { setClientStatus } from "@/app/actions";
import { ClientSheet } from "@/components/panels";
import { Pill } from "@/components/ui";
import { CLIENT_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { cn, inr } from "@/lib/format";
import type { Client, Option } from "@/lib/types";

export function ClientsBoard({
  clients,
  today,
  showLost,
  wonOptions,
}: {
  clients: Client[];
  today: string;
  showLost: boolean;
  wonOptions: Option[];
}) {
  const [items, setItems] = useState(clients);
  const [active, setActive] = useState<Client | null>(null);
  const [won, setWon] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setItems(clients), [clients]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
      const r = await setClientStatus(id, status);
      if (!r.ok) {
        setItems(prev);
        setError(r.error ?? "Could not update status");
      } else if (r.becameWon && r.id) {
        setWon({ id: r.id, label: r.label ?? c.name });
      }
    });
  }

  return (
    <>
      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActive(items.find((x) => x.id === e.active.id) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {CLIENT_STATUSES.map((status) => {
            const col = items.filter((c) => c.status === status);
            const hidden = status === "Lost" && !showLost;
            return (
              <Column key={status} status={status} count={hidden ? null : col.length} total={col.reduce((s, c) => s + Number(c.expected_value ?? 0), 0)}>
                {hidden ? (
                  <p className="px-1 py-3 text-[13px] text-faint">Lost clients are hidden. Drop a card here to mark it Lost.</p>
                ) : (
                  col.map((c) => <Card key={c.id} client={c} today={today} />)
                )}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{active ? <CardBody client={active} today={today} dragging /> : null}</DragOverlay>
      </DndContext>
      <ClientSheet open={!!won} onClose={() => setWon(null)} wonOptions={wonOptions} initialWon={won} />
    </>
  );
}

function Column({
  status,
  count,
  total,
  children,
}: {
  status: string;
  count: number | null;
  total: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[210px] flex-1 flex-col rounded-lg p-1.5 transition-colors",
        isOver ? "bg-active" : "bg-soft",
      )}
    >
      <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
        <Pill>{status}</Pill>
        {count !== null && <span className="text-[13px] text-faint">{count}</span>}
        {total > 0 && <span className="tabular ml-auto text-[12px] text-faint">{inr(total)}</span>}
      </div>
      <div className="flex min-h-16 flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Card({ client, today }: { client: Client; today: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: client.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-30")}>
      <CardBody client={client} today={today} />
    </div>
  );
}

function CardBody({ client, today, dragging }: { client: Client; today: string; dragging?: boolean }) {
  const followUp = client.follow_up_date && client.follow_up_date <= today && client.status !== "Lost";
  return (
    <Link
      href={`/clients/${client.client_code}`}
      draggable={false}
      className={cn(
        "block cursor-grab rounded-md border border-line bg-bg p-2.5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] transition-colors hover:bg-hover active:cursor-grabbing",
        dragging && "rotate-1 shadow-lg",
      )}
    >
      <div className="text-sm font-medium leading-snug">{client.name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
        <span className="tabular">{client.client_code}</span>
        {client.expected_value ? <span className="tabular">· {inr(client.expected_value)}</span> : null}
      </div>
      {(followUp || client.source) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {followUp && <Pill tone="orange">Follow up · {fmtDate(client.follow_up_date)}</Pill>}
          {client.source && <Pill tone="gray">{client.source}</Pill>}
        </div>
      )}
    </Link>
  );
}
