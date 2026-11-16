"use client";

import { useState, useTransition } from "react";
import { deleteProject, saveProject, type ActionResult } from "@/app/actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PRIORITIES, PROJECT_STATUSES } from "@/lib/constants";
import { diffDays, todayIST } from "@/lib/dates";
import { projectSchema } from "@/lib/schemas";
import type { Option, Project } from "@/lib/types";
import { FormError, FormFooter } from "./form-footer";
import { useEntityForm } from "./use-form";

export function ProjectForm({
  project,
  clientOptions,
  defaultClientId,
  onSaved,
  onCancel,
  onDeleted,
}: {
  project?: Project | null;
  clientOptions: Option[];
  defaultClientId?: string;
  onSaved: (r: ActionResult) => void;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const today = todayIST();
  const [start, setStart] = useState(project ? (project.start_date ?? "") : today);
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [busy, startBusy] = useTransition();
  const { errors, formError, pending, onSubmit, setFormError } = useEntityForm(
    projectSchema,
    (input) => saveProject(project?.id ?? null, input),
    onSaved,
  );

  // An existing project keeps its client in the list even if that client is no longer Won.
  const options =
    project && !clientOptions.some((o) => o.value === project.client_id)
      ? [{ value: project.client_id, label: `${project.client_code} · ${project.client_name}` }, ...clientOptions]
      : clientOptions;

  const duration = start && deadline && deadline >= start ? diffDays(deadline, start) + 1 : null;

  function remove() {
    if (!project) return;
    startBusy(async () => {
      const r = await deleteProject(project.id);
      if (r.ok) onDeleted?.();
      else setFormError(r.error ?? "Could not delete");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {project && (
        <div className="text-[13px] text-muted">
          Project ID <span className="tabular font-medium text-fg">{project.project_code}</span>
        </div>
      )}
      <Field
        label="Client"
        required
        error={errors.client_id}
        hint={options.length === 0 ? "No Won clients yet. Mark a client as Won first." : "Only Won clients are listed"}
      >
        <Select name="client_id" defaultValue={project?.client_id ?? defaultClientId ?? ""}>
          <option value="">Select a client…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Project name" required error={errors.name}>
        <Input name="name" defaultValue={project?.name} maxLength={120} autoFocus={!project} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" error={errors.start_date} hint="Optional">
          <Input name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field
          label="Deadline"
          error={errors.deadline}
          hint={duration ? `${duration} day${duration === 1 ? "" : "s"}` : "Optional — add it later"}
        >
          <Input name="deadline" type="date" min={start || undefined} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority" required error={errors.priority}>
          <Select name="priority" defaultValue={project?.priority ?? "Medium"}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status" required error={errors.status}>
          <Select name="status" defaultValue={project?.status ?? "Not Started"}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Project value (₹)" error={errors.value}>
        <Input name="value" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={project?.value ?? ""} />
      </Field>
      <Field label="Description" error={errors.notes} hint="Scope, links, terms — anything about the project">
        <Textarea name="notes" defaultValue={project?.notes ?? ""} rows={6} />
      </Field>
      <FormError message={formError} />
      <FormFooter
        pending={pending || busy}
        onCancel={onCancel}
        onDelete={project ? remove : undefined}
        submitLabel={project ? "Save" : "Add project"}
      />
    </form>
  );
}
