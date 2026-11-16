"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { Button, LinkButton } from "@/components/ui";
import type { Client, Option, Payment, Project } from "@/lib/types";
import { ClientForm } from "./forms/client-form";
import { PaymentForm } from "./forms/payment-form";
import { ProjectForm } from "./forms/project-form";

type Won = { id: string; label: string; projectCode?: string };

/** Client create/edit. When a client becomes Won, a project is auto-created; we point the user to it. */
export function ClientSheet({
  open,
  onClose,
  client,
  initialWon,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  initialWon?: Won | null;
  defaultStatus?: string;
}) {
  const [won, setWon] = useState<Won | null>(initialWon ?? null);

  useEffect(() => {
    if (open) setWon(initialWon ?? null);
  }, [open, initialWon]);

  return (
    <Sheet open={open} onClose={onClose} title={won ? "Client won" : client ? client.name : "New client"}>
      {won ? (
        <WonNotice won={won} onClose={onClose} />
      ) : (
        <ClientForm
          key={client?.id ?? "new"}
          client={client}
          defaultStatus={defaultStatus}
          onSaved={(r) => (r.becameWon && r.id ? setWon({ id: r.id, label: r.label ?? "This client", projectCode: r.projectCode }) : onClose())}
          onCancel={onClose}
        />
      )}
    </Sheet>
  );
}

export function WonNotice({ won, onClose }: { won: Won; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <p className="leading-relaxed">
        <span className="font-medium">{won.label}</span> is now <span className="font-medium">Won</span>.
        {won.projectCode ? (
          <> Project <span className="tabular font-medium">{won.projectCode}</span> was created for it — open it to add the deadline and details.</>
        ) : (
          <> It already has a project.</>
        )}
      </p>
      <div className="flex gap-2">
        {won.projectCode && (
          <LinkButton variant="primary" href={`/projects/${won.projectCode}`}>
            Open project
          </LinkButton>
        )}
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

export function ProjectSheet({
  open,
  onClose,
  project,
  clientOptions,
  defaultClientId,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  clientOptions: Option[];
  defaultClientId?: string;
  onDeleted?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={project ? project.name : "New project"}>
      <ProjectForm
        key={project?.id ?? "new"}
        project={project}
        clientOptions={clientOptions}
        defaultClientId={defaultClientId}
        onSaved={onClose}
        onCancel={onClose}
        onDeleted={onDeleted ?? onClose}
      />
    </Sheet>
  );
}

export function PaymentSheet({
  open,
  onClose,
  payment,
  clientOptions,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  payment?: Payment | null;
  clientOptions: Option[];
  defaultClientId?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={payment ? `Payment ${payment.payment_code}` : "New payment"}>
      <PaymentForm
        key={payment?.id ?? "new"}
        payment={payment}
        clientOptions={clientOptions}
        defaultClientId={defaultClientId}
        onSaved={onClose}
        onCancel={onClose}
        onDeleted={onClose}
      />
    </Sheet>
  );
}

/** Opens when the URL has ?new=1 (used by dashboard empty-state links). */
function useNewParam(): [boolean, (v: boolean) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);
  return [
    open,
    (v: boolean) => {
      setOpen(v);
      if (!v && params.get("new")) {
        const next = new URLSearchParams(params.toString());
        next.delete("new");
        next.delete("client");
        router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
      }
    },
  ];
}

export function AddClientButton({ label = "New client" }: { label?: string }) {
  const [open, setOpen] = useNewParam();
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> {label}
      </Button>
      <ClientSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AddProjectButton({
  clientOptions,
  defaultClientId,
  label = "New project",
  variant = "primary",
  urlDriven = true,
}: {
  clientOptions: Option[];
  defaultClientId?: string;
  label?: string;
  variant?: "primary" | "outline";
  urlDriven?: boolean;
}) {
  const [urlOpen, setUrlOpen] = useNewParam();
  const [localOpen, setLocalOpen] = useState(false);
  const open = urlDriven ? urlOpen : localOpen;
  const setOpen = urlDriven ? setUrlOpen : setLocalOpen;
  const params = useSearchParams();
  const fromUrl = params.get("client");
  const preset = defaultClientId ?? clientOptions.find((o) => o.label.startsWith(`${fromUrl} `))?.value;
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus size={15} /> {label}
      </Button>
      <ProjectSheet open={open} onClose={() => setOpen(false)} clientOptions={clientOptions} defaultClientId={preset} />
    </>
  );
}

export function AddPaymentButton({
  clientOptions,
  defaultClientId,
  label = "New payment",
  variant = "primary",
  urlDriven = true,
}: {
  clientOptions: Option[];
  defaultClientId?: string;
  label?: string;
  variant?: "primary" | "outline";
  urlDriven?: boolean;
}) {
  const [urlOpen, setUrlOpen] = useNewParam();
  const [localOpen, setLocalOpen] = useState(false);
  const open = urlDriven ? urlOpen : localOpen;
  const setOpen = urlDriven ? setUrlOpen : setLocalOpen;
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus size={15} /> {label}
      </Button>
      <PaymentSheet open={open} onClose={() => setOpen(false)} clientOptions={clientOptions} defaultClientId={defaultClientId} />
    </>
  );
}
