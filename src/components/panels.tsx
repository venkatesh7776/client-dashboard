"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui";
import type { Client, Option, Payment, Project } from "@/lib/types";
import { ClientForm } from "./forms/client-form";
import { PaymentForm } from "./forms/payment-form";
import { ProjectForm } from "./forms/project-form";

type Won = { id: string; label: string };

/** Client create/edit; when a client becomes Won, offers "Create project" with it pre-selected (CL-4). */
export function ClientSheet({
  open,
  onClose,
  client,
  wonOptions,
  initialWon,
  defaultStatus,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  wonOptions: Option[];
  initialWon?: Won | null;
  defaultStatus?: string;
  onDeleted?: () => void;
}) {
  const [won, setWon] = useState<Won | null>(initialWon ?? null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setWon(initialWon ?? null);
      setCreating(false);
    }
  }, [open, initialWon]);

  const title = won ? (creating ? "New project" : "Client won") : client ? client.name : "New client";

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {won ? (
        creating ? (
          <ProjectForm
            clientOptions={wonOptions.some((o) => o.value === won.id) ? wonOptions : [{ value: won.id, label: won.label }, ...wonOptions]}
            defaultClientId={won.id}
            onSaved={onClose}
            onCancel={onClose}
          />
        ) : (
          <div className="space-y-5">
            <p className="leading-relaxed">
              <span className="font-medium">{won.label}</span> is now <span className="font-medium">Won</span>. Create a
              project for this client?
            </p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create project
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Not now
              </Button>
            </div>
          </div>
        )
      ) : (
        <ClientForm
          key={client?.id ?? "new"}
          client={client}
          defaultStatus={defaultStatus}
          onSaved={(r) => (r.becameWon && r.id ? setWon({ id: r.id, label: r.label ?? "This client" }) : onClose())}
          onCancel={onClose}
          onDeleted={onDeleted ?? onClose}
        />
      )}
    </Sheet>
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

export function AddClientButton({ wonOptions, label = "New client" }: { wonOptions: Option[]; label?: string }) {
  const [open, setOpen] = useNewParam();
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> {label}
      </Button>
      <ClientSheet open={open} onClose={() => setOpen(false)} wonOptions={wonOptions} />
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
