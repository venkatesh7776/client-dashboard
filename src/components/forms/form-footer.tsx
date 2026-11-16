"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md px-3 py-2 text-[13px]" style={{ background: "var(--tag-red-bg)", color: "var(--tag-red-fg)" }}>
      {message}
    </div>
  );
}

export function FormFooter({
  pending,
  onCancel,
  onDelete,
  submitLabel = "Save",
}: {
  pending: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  submitLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
      <div>
        {onDelete &&
          (confirming ? (
            <span className="flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={onDelete} disabled={pending}>
                Confirm delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          ))}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
