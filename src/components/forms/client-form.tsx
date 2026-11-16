"use client";

import { useState } from "react";
import { saveClient, type ActionResult } from "@/app/actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { CLIENT_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { clientSchema } from "@/lib/schemas";
import type { Client } from "@/lib/types";
import { FormError, FormFooter } from "./form-footer";
import { useEntityForm } from "./use-form";

export function ClientForm({
  client,
  defaultStatus,
  onSaved,
  onCancel,
}: {
  client?: Client | null;
  defaultStatus?: string;
  onSaved: (r: ActionResult) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(client?.status ?? defaultStatus ?? "Lead");
  const { errors, formError, pending, onSubmit } = useEntityForm(
    clientSchema,
    (input) => saveClient(client?.id ?? null, input),
    onSaved,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {client && (
        <div className="text-[13px] text-muted">
          Client ID <span className="tabular font-medium text-fg">{client.client_code}</span>
        </div>
      )}
      <Field label="Client name" required error={errors.name}>
        <Input name="name" defaultValue={client?.name} maxLength={120} autoFocus={!client} placeholder="Person or company" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" required error={errors.status}>
          <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Lead source" error={errors.source}>
          <Select name="source" defaultValue={client?.source ?? ""}>
            <option value="">—</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      {status === "Lost" && (
        <Field label="Lost reason" error={errors.lost_reason}>
          <Input name="lost_reason" defaultValue={client?.lost_reason ?? ""} placeholder="Why was it lost?" />
        </Field>
      )}
      <Field label="Contact person" error={errors.contact_person}>
        <Input name="contact_person" defaultValue={client?.contact_person ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" error={errors.phone}>
          <Input name="phone" type="tel" defaultValue={client?.phone ?? ""} placeholder="98765 43210" />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input name="email" type="email" defaultValue={client?.email ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected value (₹)" error={errors.expected_value}>
          <Input name="expected_value" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={client?.expected_value ?? ""} />
        </Field>
        <Field label="Follow-up date" error={errors.follow_up_date}>
          <Input name="follow_up_date" type="date" defaultValue={client?.follow_up_date ?? ""} />
        </Field>
      </div>
      <Field label="Notes" error={errors.notes}>
        <Textarea name="notes" defaultValue={client?.notes ?? ""} rows={4} />
      </Field>

      {status === "Closed" && client?.status !== "Closed" && client?.status !== "Delivered" && (
        <p className="text-[12.5px] text-muted">A project for this client is created automatically when you save. Add its dates later.</p>
      )}
      <FormError message={formError} />
      <FormFooter pending={pending} onCancel={onCancel} submitLabel={client ? "Save" : "Add client"} />
    </form>
  );
}
