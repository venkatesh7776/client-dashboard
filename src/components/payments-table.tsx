"use client";

import Link from "next/link";
import { useState } from "react";
import { PaymentSheet } from "@/components/panels";
import { Table, Td, Th } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { inr } from "@/lib/format";
import type { Option, Payment } from "@/lib/types";

export function PaymentsTable({ payments, clientOptions }: { payments: Payment[]; clientOptions: Option[] }) {
  const [editing, setEditing] = useState<Payment | null>(null);
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Payment ID</Th>
            <Th>Client ID</Th>
            <Th>Client</Th>
            <Th>Mode</Th>
            <Th className="text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} onClick={() => setEditing(p)} className="cursor-pointer">
              <Td className="tabular">{fmtDate(p.payment_date)}</Td>
              <Td className="tabular text-muted">{p.payment_code}</Td>
              <Td className="tabular text-muted">{p.clients?.client_code}</Td>
              <Td>
                <Link href={`/clients/${p.clients?.client_code}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                  {p.clients?.name}
                </Link>
              </Td>
              <Td className="text-muted">{p.mode ?? "—"}</Td>
              <Td className="tabular text-right font-medium">{inr(p.amount)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <PaymentSheet open={!!editing} onClose={() => setEditing(null)} payment={editing} clientOptions={clientOptions} />
    </>
  );
}
