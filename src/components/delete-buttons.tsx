"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteClient, deleteProject, getClientDeleteImpact } from "@/app/actions";
import { Button } from "@/components/ui";
import { inr } from "@/lib/format";

function Confirm({
  title,
  body,
  onCancel,
  onConfirm,
  pending,
  error,
}: {
  title: string;
  body: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center px-4" onClick={(e) => e.stopPropagation()}>
      <div className="animate-fade-in absolute inset-0 bg-black/25 dark:bg-black/55" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" className="animate-fade-in relative w-full max-w-sm rounded-lg border border-line bg-bg p-5 shadow-xl">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-muted">{body}</div>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className="border-transparent bg-[var(--danger)] text-white hover:bg-[var(--danger)] hover:opacity-90"
            autoFocus
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Trigger({ icon, label, onClick }: { icon?: boolean; label: string; onClick: () => void }) {
  return icon ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-faint opacity-60 transition hover:bg-hover hover:text-danger hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
    >
      <Trash2 size={15} />
    </button>
  ) : (
    <Button variant="danger" onClick={onClick}>
      <Trash2 size={14} /> Delete
    </Button>
  );
}

export function DeleteClientButton({
  id,
  label,
  icon,
  redirectTo,
}: {
  id: string;
  label: string;
  icon?: boolean;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<Awaited<ReturnType<typeof getClientDeleteImpact>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function openDialog() {
    setOpen(true);
    setError(null);
    setImpact(null);
    getClientDeleteImpact(id).then(setImpact).catch(() => setImpact({ projects: 0, payments: 0, paymentsTotal: 0 }));
  }

  return (
    <>
      <Trigger icon={icon} label={`Delete ${label}`} onClick={openDialog} />
      {open && (
        <Confirm
          title={`Delete ${label}?`}
          pending={pending || !impact}
          error={error}
          onCancel={() => setOpen(false)}
          onConfirm={() =>
            start(async () => {
              const r = await deleteClient(id);
              if (!r.ok) return setError(r.error ?? "Could not delete");
              setOpen(false);
              if (redirectTo) router.push(redirectTo);
            })
          }
          body={
            !impact ? (
              "Checking what's linked to this client…"
            ) : impact.projects === 0 && impact.payments === 0 ? (
              "This can't be undone."
            ) : (
              <>
                This also deletes{" "}
                {[
                  impact.projects > 0 && `${impact.projects} project${impact.projects === 1 ? "" : "s"}`,
                  impact.payments > 0 && `${impact.payments} payment${impact.payments === 1 ? "" : "s"} (${inr(impact.paymentsTotal)})`,
                ]
                  .filter(Boolean)
                  .join(" and ")}
                .{impact.payments > 0 && " Your income totals will go down by that amount."} This can&apos;t be undone.
              </>
            )
          }
        />
      )}
    </>
  );
}

export function DeleteProjectButton({
  id,
  label,
  icon,
  redirectTo,
}: {
  id: string;
  label: string;
  icon?: boolean;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Trigger icon={icon} label={`Delete ${label}`} onClick={() => (setOpen(true), setError(null))} />
      {open && (
        <Confirm
          title={`Delete ${label}?`}
          body="Its files are deleted too, and linked to-dos stay on your board. This can't be undone."
          pending={pending}
          error={error}
          onCancel={() => setOpen(false)}
          onConfirm={() =>
            start(async () => {
              const r = await deleteProject(id);
              if (!r.ok) return setError(r.error ?? "Could not delete");
              setOpen(false);
              if (redirectTo) router.push(redirectTo);
            })
          }
        />
      )}
    </>
  );
}
