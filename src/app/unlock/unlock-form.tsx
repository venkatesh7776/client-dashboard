"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { unlock } from "./actions";

export function UnlockForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(unlock, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-[13px] text-muted">Passcode</span>
        <Input name="passcode" type="password" autoFocus autoComplete="current-password" required />
      </label>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Unlock"}
      </Button>
    </form>
  );
}
