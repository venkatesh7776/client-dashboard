"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { z } from "zod";
import type { ActionResult } from "@/app/actions";
import { parseForm, type FieldErrors } from "@/lib/schemas";

/**
 * Validates with the shared Zod schema first (instant feedback), then calls the server action.
 * Inputs are uncontrolled, so whatever was typed stays on screen if the save fails.
 */
export function useEntityForm<S extends z.ZodType>(
  schema: S,
  action: (input: Record<string, FormDataEntryValue>) => Promise<ActionResult>,
  onSuccess: (r: ActionResult) => void,
) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(e.currentTarget));
    const local = parseForm(schema, input);
    if (!local.ok) {
      setErrors(local.errors);
      return;
    }
    setErrors({});
    setFormError(null);
    start(async () => {
      try {
        const r = await action(input);
        if (r.ok) onSuccess(r);
        else {
          setErrors(r.errors ?? {});
          setFormError(r.error ?? (r.errors ? null : "Could not save. Please try again."));
        }
      } catch {
        setFormError("Could not reach the server. Your changes are still here — try again.");
      }
    });
  }

  return { errors, formError, pending, onSubmit, setFormError };
}
