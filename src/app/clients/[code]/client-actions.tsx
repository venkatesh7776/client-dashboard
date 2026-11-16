"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { DeleteClientButton } from "@/components/delete-buttons";
import { AddPaymentButton, AddProjectButton, ClientSheet } from "@/components/panels";
import { Button } from "@/components/ui";
import type { Client, Option } from "@/lib/types";

export function ClientActions({
  client,
  wonOptions,
  paymentOptions,
}: {
  client: Client;
  wonOptions: Option[];
  paymentOptions: Option[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Pencil size={14} /> Edit
      </Button>
      {client.status === "Won" && (
        <AddProjectButton clientOptions={wonOptions} defaultClientId={client.id} label="Project" variant="outline" urlDriven={false} />
      )}
      {client.status !== "Lost" && (
        <AddPaymentButton clientOptions={paymentOptions} defaultClientId={client.id} label="Payment" variant="primary" urlDriven={false} />
      )}
      <DeleteClientButton id={client.id} label={`${client.client_code} · ${client.name}`} redirectTo="/clients" />
      <ClientSheet open={open} onClose={() => setOpen(false)} client={client} />
    </>
  );
}
