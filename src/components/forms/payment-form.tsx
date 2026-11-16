"use client";

import { useState, useTransition } from "react";
import { deletePayment, savePayment, type ActionResult } from "@/app/actions";
import { Field, Input, Select } from "@/components/ui";
import { PAYMENT_MODES } from "@/lib/constants";
import { monthLabel, todayIST } from "@/lib/dates";
import { paymentSchema } from "@/lib/schemas";
import type { Option, Payment } from "@/lib/types";
import { FormError, FormFooter } from "./form-footer";
import { useEntityForm } from "./use-form";

export function PaymentForm({
  payment,
  clientOptions,
  defaultClientId,
  onSaved,
  onCancel,
  onDeleted,
}: {
  payment?: Payment | null;
  clientOptions: Option[];
  defaultClientId?: string;
  onSaved: (r: ActionResult) => void;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const today = todayIST();
  const [date, setDate] = useState(payment?.payment_date ?? today);
  const [busy, startBusy] = useTransition();
  const { errors, formError, pending, onSubmit, setFormError } = useEntityForm(
    paymentSchema,
    (input) => savePayment(payment?.id ?? null, input),
    onSaved,
  );

  const options =
    payment && payment.clients && !clientOptions.some((o) => o.value === payment.client_id)
      ? [{ value: payment.client_id, label: `${payment.clients.client_code} · ${payment.clients.name}` }, ...clientOptions]
      : clientOptions;

  function remove() {
    if (!payment) return;
    startBusy(async () => {
      const r = await deletePayment(payment.id);
      if (r.ok) onDeleted?.();
      else setFormError(r.error ?? "Could not delete");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {payment && (
        <div className="text-[13px] text-muted">
          Payment ID <span className="tabular font-medium text-fg">{payment.payment_code}</span>
        </div>
      )}
      <Field label="Client" required error={errors.client_id}>
        <Select name="client_id" defaultValue={payment?.client_id ?? defaultClientId ?? ""} autoFocus={!payment}>
          <option value="">Select a client…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Amount received (₹)" required error={errors.amount}>
        <Input name="amount" type="number" min={0.01} step="0.01" inputMode="decimal" defaultValue={payment?.amount ?? ""} placeholder="0" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment date" required error={errors.payment_date}>
          <Input name="payment_date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Month">
          <div className="flex h-8 items-center rounded-md bg-soft px-2.5 text-sm text-muted">
            {/^\d{4}-\d{2}-\d{2}$/.test(date) ? monthLabel(date) : "—"}
          </div>
        </Field>
      </div>
      <Field label="Mode" error={errors.mode}>
        <Select name="mode" defaultValue={payment?.mode ?? ""}>
          <option value="">—</option>
          {PAYMENT_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </Field>
      <Field label="Notes" error={errors.notes} hint="Transaction ID, purpose">
        <Input name="notes" defaultValue={payment?.notes ?? ""} />
      </Field>
      <FormError message={formError} />
      <FormFooter
        pending={pending || busy}
        onCancel={onCancel}
        onDelete={payment ? remove : undefined}
        submitLabel={payment ? "Save" : "Add payment"}
      />
    </form>
  );
}
