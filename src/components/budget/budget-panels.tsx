"use client";

import { Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { copyBudget, deleteExpense, saveBudget, saveExpense, type ActionResult } from "@/app/actions";
import { FormError, FormFooter } from "@/components/forms/form-footer";
import { useEntityForm } from "@/components/forms/use-form";
import { Sheet } from "@/components/sheet";
import { notify } from "@/components/toast";
import { Button, Field, Input, Select, Table, Td, Th } from "@/components/ui";
import { SECTORS, type SectorKey } from "@/lib/constants";
import { fmtDate, monthLabel, todayIST } from "@/lib/dates";
import { cn, inr } from "@/lib/format";
import { budgetSchema, expenseSchema } from "@/lib/schemas";
import type { Budget, Expense } from "@/lib/types";

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/,/g, "")) || 0;

// ───────────────────────── Budget form

function BudgetForm({ month, budget, onDone }: { month: string; budget: Budget | null; onDone: () => void }) {
  const [sums, setSums] = useState(() => ({
    total: budget?.total ?? 0,
    split: budget ? budget.personal + budget.ads + budget.physical + budget.digital : 0,
  }));
  const { errors, formError, pending, onSubmit } = useEntityForm(budgetSchema, (input) => saveBudget(input), (r: ActionResult) => {
    if (r.ok) notify(`Budget saved for ${monthLabel(month)}.`);
    onDone();
  });
  const unallocated = sums.total - sums.split;

  return (
    <form
      onSubmit={onSubmit}
      onInput={(e) => {
        const f = new FormData(e.currentTarget);
        setSums({ total: num(f.get("total")), split: SECTORS.reduce((s, x) => s + num(f.get(x.key)), 0) });
      }}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="month" value={month} />
      <Field label={`Main budget for ${monthLabel(month)} (₹)`} required error={errors.total}>
        <Input name="total" type="number" min={1} step="0.01" inputMode="decimal" defaultValue={budget?.total ?? ""} placeholder="20000" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {SECTORS.map((s) => (
          <Field key={s.key} label={s.label} error={errors[s.key]}>
            <Input name={s.key} type="number" min={0} step="0.01" inputMode="decimal" defaultValue={budget?.[s.key] ?? ""} placeholder="0" />
          </Field>
        ))}
      </div>
      <div className={cn("tabular flex items-center justify-between rounded-md bg-soft px-3 py-2 text-[13px]", unallocated < 0 ? "text-danger" : "text-muted")}>
        <span>{unallocated < 0 ? "Sectors exceed the main budget by" : "Not given to any sector"}</span>
        <span className="font-medium">{inr(Math.abs(unallocated))}</span>
      </div>
      <FormError message={formError} />
      <FormFooter pending={pending} onCancel={onDone} submitLabel="Save budget" />
    </form>
  );
}

export function EditBudgetButton({ month, budget, variant = "outline" }: { month: string; budget: Budget | null; variant?: "outline" | "primary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {budget ? <><Pencil size={14} /> Edit budget</> : "Set budget"}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={budget ? "Edit budget" : "Set budget"}>
        {open && <BudgetForm month={month} budget={budget} onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}

export function CopyBudgetButton({ from, to }: { from: Budget; to: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await copyBudget(from.month, to);
          notify(r.ok ? `Copied ${monthLabel(from.month)}'s budget.` : (r.error ?? "Could not copy"));
        })
      }
    >
      {pending ? "Copying…" : `Use ${monthLabel(from.month).split(" ")[0]}'s budget · ${inr(from.total)}`}
    </Button>
  );
}

// ───────────────────────── Expense form

function ExpenseForm({
  expense,
  defaultDate,
  defaultCategory,
  onDone,
}: {
  expense?: Expense | null;
  defaultDate: string;
  defaultCategory?: SectorKey;
  onDone: () => void;
}) {
  const today = todayIST();
  const [busy, startBusy] = useTransition();
  const { errors, formError, pending, onSubmit, setFormError } = useEntityForm(
    expenseSchema,
    (input) => saveExpense(expense?.id ?? null, input),
    () => {
      if (!expense) notify("Expense added.");
      onDone();
    },
  );

  function remove() {
    if (!expense) return;
    startBusy(async () => {
      const r = await deleteExpense(expense.id);
      if (r.ok) onDone();
      else setFormError(r.error ?? "Could not delete");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Amount spent (₹)" required error={errors.amount}>
        <Input name="amount" type="number" min={0.01} step="0.01" inputMode="decimal" defaultValue={expense?.amount ?? ""} placeholder="0" autoFocus />
      </Field>
      <Field label="Sector" required error={errors.category}>
        <Select name="category" defaultValue={expense?.category ?? defaultCategory ?? ""}>
          <option value="">Select a sector…</option>
          {SECTORS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="What was it for?" required error={errors.purpose}>
        <Input name="purpose" maxLength={200} defaultValue={expense?.purpose ?? ""} placeholder="e.g. Meta ads campaign" />
      </Field>
      <Field label="Date" required error={errors.spent_on}>
        <Input name="spent_on" type="date" max={today} defaultValue={expense?.spent_on ?? defaultDate} />
      </Field>
      <FormError message={formError} />
      <FormFooter pending={pending || busy} onCancel={onDone} onDelete={expense ? remove : undefined} submitLabel={expense ? "Save" : "Add expense"} />
    </form>
  );
}

export function AddExpenseButton({ defaultDate, defaultCategory }: { defaultDate: string; defaultCategory?: SectorKey }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add expense
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="New expense">
        {open && <ExpenseForm defaultDate={defaultDate} defaultCategory={defaultCategory} onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}

// ───────────────────────── Expense list

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const label = Object.fromEntries(SECTORS.map((s) => [s.key, s]));
  return (
    <>
      <Table bare>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Sector</Th>
            <Th>For</Th>
            <Th className="text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} onClick={() => setEditing(e)} className="cursor-pointer">
              <Td className="tabular text-muted">{fmtDate(e.spent_on)}</Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: label[e.category]?.color }} />
                  {label[e.category]?.label}
                </span>
              </Td>
              <Td className="max-w-[320px] truncate">{e.purpose}</Td>
              <Td className="tabular text-right font-medium">{inr(e.amount)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit expense">
        {editing && <ExpenseForm key={editing.id} expense={editing} defaultDate={editing.spent_on} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}
