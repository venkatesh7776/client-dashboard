"use client";

import { useTransition } from "react";
import { deleteTodo, saveTodo, type ActionResult } from "@/app/actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { PRIORITIES } from "@/lib/constants";
import { todoSchema } from "@/lib/schemas";
import type { Option, Todo } from "@/lib/types";
import { FormError, FormFooter } from "./form-footer";
import { useEntityForm } from "./use-form";

export function TodoForm({
  todo,
  projectOptions,
  onSaved,
  onCancel,
  onDeleted,
}: {
  todo: Todo;
  projectOptions: Option[];
  onSaved: (r: ActionResult) => void;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const [busy, startBusy] = useTransition();
  const { errors, formError, pending, onSubmit, setFormError } = useEntityForm(
    todoSchema,
    (input) => saveTodo(todo.id, input),
    onSaved,
  );

  const options =
    todo.project_id && todo.projects && !projectOptions.some((o) => o.value === todo.project_id)
      ? [{ value: todo.project_id, label: `${todo.projects.project_code} · ${todo.projects.name}` }, ...projectOptions]
      : projectOptions;

  function remove() {
    startBusy(async () => {
      const r = await deleteTodo(todo.id);
      if (r.ok) onDeleted?.();
      else setFormError(r.error ?? "Could not delete");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Title" required error={errors.title}>
        <Input name="title" defaultValue={todo.title} maxLength={200} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date" error={errors.due_date} hint="Empty = Later">
          <Input name="due_date" type="date" defaultValue={todo.due_date ?? ""} />
        </Field>
        <Field label="Priority" error={errors.priority}>
          <Select name="priority" defaultValue={todo.priority ?? ""}>
            <option value="">—</option>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Project" error={errors.project_id}>
        <Select name="project_id" defaultValue={todo.project_id ?? ""}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_done" defaultChecked={todo.is_done} className="size-4 accent-[var(--accent)]" />
        Done
      </label>
      <Field label="Notes" error={errors.notes}>
        <Textarea name="notes" defaultValue={todo.notes ?? ""} rows={4} />
      </Field>
      <FormError message={formError} />
      <FormFooter pending={pending || busy} onCancel={onCancel} onDelete={remove} />
    </form>
  );
}
