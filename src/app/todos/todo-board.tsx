"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bell, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { quickAddTodo, reorderTodos, toggleTodo } from "@/app/actions";
import { TodoForm } from "@/components/forms/todo-form";
import { Sheet } from "@/components/sheet";
import { TodoRow } from "@/components/todo-list";
import { addDays, fmtDate } from "@/lib/dates";
import { cn } from "@/lib/format";
import { CARD_LABEL, CARDS, cardDate, groupTodos, type CardKey } from "@/lib/todos";
import type { Option, Todo } from "@/lib/types";

type FollowUp = { id: string; client_code: string; name: string; follow_up_date: string | null };
type Lists = Record<CardKey, string[]>;

export function TodoBoard({
  todos,
  today,
  followUps,
  projectOptions,
}: {
  todos: Todo[];
  today: string;
  followUps: FollowUp[];
  projectOptions: Option[];
}) {
  const [byId, setById] = useState<Record<string, Todo>>({});
  const [lists, setLists] = useState<Lists>({ today: [], tomorrow: [], dayafter: [], later: [] });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const fromCard = useRef<CardKey | null>(null);

  useEffect(() => {
    const g = groupTodos(todos, today);
    setById(Object.fromEntries(todos.map((t) => [t.id, t])));
    setLists({
      today: g.today.map((t) => t.id),
      tomorrow: g.tomorrow.map((t) => t.id),
      dayafter: g.dayafter.map((t) => t.id),
      later: g.later.map((t) => t.id),
    });
  }, [todos, today]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findCard = (id: string): CardKey | null =>
    (CARDS as readonly string[]).includes(id) ? (id as CardKey) : (CARDS.find((c) => lists[c].includes(id)) ?? null);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    fromCard.current = findCard(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findCard(id);
    const to = findCard(overId);
    if (!from || !to || from === to) return;
    setLists((l) => {
      const target = l[to];
      const idx = target.indexOf(overId);
      const at = idx >= 0 ? idx : target.length;
      return { ...l, [from]: l[from].filter((x) => x !== id), [to]: [...target.slice(0, at), id, ...target.slice(at)] };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    const card = findCard(id);
    if (!card || !overId) return;

    let order = lists[card];
    const oldIdx = order.indexOf(id);
    const newIdx = order.indexOf(overId);
    if (newIdx >= 0 && oldIdx !== newIdx) order = arrayMove(order, oldIdx, newIdx);
    setLists((l) => ({ ...l, [card]: order }));

    const movedCard = fromCard.current !== card;
    if (!movedCard && oldIdx === newIdx) return;
    const due = cardDate(card, today);
    if (movedCard) setById((m) => ({ ...m, [id]: { ...m[id], due_date: due } }));
    setError(null);
    start(async () => {
      const r = await reorderTodos(order, movedCard ? { id, due_date: due } : undefined);
      if (!r.ok) setError(r.error ?? "Could not save the new order");
    });
  }

  function toggle(id: string, done: boolean) {
    setById((m) => ({ ...m, [id]: { ...m[id], is_done: done } }));
    start(async () => {
      const r = await toggleTodo(id, done);
      if (!r.ok) {
        setById((m) => ({ ...m, [id]: { ...m[id], is_done: !done } }));
        setError(r.error ?? "Could not update");
      }
    });
  }

  function add(card: CardKey, title: string) {
    const tempId = `temp-${Date.now()}`;
    const due = cardDate(card, today);
    setById((m) => ({
      ...m,
      [tempId]: { id: tempId, title, due_date: due, priority: null, is_done: false, done_at: null, sort_order: 0, project_id: null, notes: null, projects: null },
    }));
    setLists((l) => ({ ...l, [card]: [...l[card], tempId] }));
    start(async () => {
      const r = await quickAddTodo(title, due);
      if (!r.ok) {
        setLists((l) => ({ ...l, [card]: l[card].filter((x) => x !== tempId) }));
        setError(r.errors?.title ?? r.error ?? "Could not add");
      }
    });
  }

  const active = activeId ? byId[activeId] : null;

  return (
    <>
      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
      <DndContext
        id="todo-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((card, i) => (
            <TodoCard
              key={card}
              card={card}
              date={card === "later" ? null : addDays(today, i)}
              ids={lists[card]}
              byId={byId}
              today={today}
              onToggle={toggle}
              onOpen={(t) => !t.id.startsWith("temp-") && setEditing(t)}
              onAdd={(title) => add(card, title)}
              header={
                card === "today" && followUps.length > 0 ? (
                  <div className="mb-1 space-y-0.5 border-b border-line pb-1.5">
                    {followUps.map((f) => (
                      <Link
                        key={f.id}
                        href={`/clients/${f.client_code}`}
                        className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-hover"
                      >
                        <Bell size={14} className="mt-0.5 shrink-0" style={{ color: "var(--tag-orange-fg)" }} />
                        <span className="min-w-0">
                          <span className="block leading-snug">Follow up with {f.name}</span>
                          <span className="text-[12px] text-muted">
                            {f.client_code}
                            {f.follow_up_date && f.follow_up_date < today ? ` · since ${fmtDate(f.follow_up_date)}` : ""}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null
              }
            />
          ))}
        </div>
        <DragOverlay>
          {active ? (
            <div className="rounded-md border border-line bg-bg shadow-lg">
              <TodoRow todo={active} today={today} onToggle={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit to-do">
        {editing && (
          <TodoForm
            key={editing.id}
            todo={editing}
            projectOptions={projectOptions}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
            onDeleted={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  );
}

function TodoCard({
  card,
  date,
  ids,
  byId,
  today,
  onToggle,
  onOpen,
  onAdd,
  header,
}: {
  card: CardKey;
  date: string | null;
  ids: string[];
  byId: Record<string, Todo>;
  today: string;
  onToggle: (id: string, done: boolean) => void;
  onOpen: (t: Todo) => void;
  onAdd: (title: string) => void;
  header?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: card });
  const [value, setValue] = useState("");
  const items = useMemo(() => ids.map((id) => byId[id]).filter(Boolean), [ids, byId]);
  const open = items.filter((t) => !t.is_done).length;

  return (
    <section className={cn("flex flex-col rounded-lg border border-line bg-soft transition-colors", isOver && "border-line-strong bg-active")}>
      <header className="flex items-baseline justify-between gap-2 px-3.5 pt-3 pb-2">
        <h2 className="text-sm font-semibold">{CARD_LABEL[card]}</h2>
        <span className="text-[12px] text-muted">
          {date ? fmtDate(date).slice(0, 6) : "Undated & later"}
          {open > 0 && <span className="ml-2 text-faint">{open}</span>}
        </span>
      </header>
      <div ref={setNodeRef} className="flex min-h-20 flex-1 flex-col px-1.5">
        {header}
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((t) => (
            <SortableTodo key={t.id} todo={t} today={today} onToggle={(d) => onToggle(t.id, d)} onOpen={() => onOpen(t)} />
          ))}
        </SortableContext>
        {items.length === 0 && !header && <p className="px-2 py-3 text-[13px] text-faint">Nothing here.</p>}
      </div>
      <form
        className="px-1.5 pt-1 pb-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!v) return;
          onAdd(v.slice(0, 200));
          setValue("");
        }}
      >
        <label className="flex h-8 items-center gap-2 rounded-md px-2 text-muted focus-within:bg-bg hover:bg-hover">
          <Plus size={15} className="shrink-0" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={200}
            placeholder="Add a to-do"
            aria-label={`Add a to-do to ${CARD_LABEL[card]}`}
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint"
          />
        </label>
      </form>
    </section>
  );
}

function SortableTodo({
  todo,
  today,
  onToggle,
  onOpen,
}: {
  todo: Todo;
  today: string;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn("touch-manipulation rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#2383e2]/40", isDragging && "opacity-30")}
    >
      <TodoRow todo={todo} today={today} onToggle={onToggle} onOpen={onOpen} />
    </div>
  );
}
