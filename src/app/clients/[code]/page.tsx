import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DaysLeft, TimelineTag } from "@/components/project-bits";
import { Properties } from "@/components/property-list";
import { Empty, Pill, PriorityDot, Section, Stat, Table, Td, Th } from "@/components/ui";
import { getClientByCode, getClientOptions, getPayments, getProjects } from "@/lib/data";
import { fmtDate, todayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { ClientActions } from "./client-actions";

export default async function ClientDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const client = await getClientByCode(decodeURIComponent(code));
  if (!client) notFound();

  const [projects, payments, wonOptions, paymentOptions] = await Promise.all([
    getProjects({ clientId: client.id, all: true }),
    getPayments({ clientId: client.id }),
    getClientOptions("won"),
    getClientOptions("notLost"),
  ]);
  const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0);
  const today = todayIST();
  const followUp = client.follow_up_date && client.follow_up_date <= today && client.status !== "Lost";

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft size={14} /> Clients
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="tabular text-[13px] text-muted">{client.client_code}</div>
          <h1 className="mt-0.5 text-[28px] font-bold tracking-tight sm:text-[32px]">{client.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill>{client.status}</Pill>
            {followUp && <Pill tone="orange">Follow up</Pill>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClientActions client={client} wonOptions={wonOptions} paymentOptions={paymentOptions} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="order-2 space-y-6 lg:order-1">
          <Section title={`Projects · ${projects.length}`}>
            {projects.length === 0 ? (
              <Empty message={client.status === "Won" ? "No projects yet." : "Projects can be added once this client is Won."} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Project</Th>
                    <Th>Start</Th>
                    <Th>Deadline</Th>
                    <Th>Days left</Th>
                    <Th>Status</Th>
                    <Th>Timeline</Th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <Link href={`/projects/${p.project_code}`} className="flex items-center gap-2 font-medium hover:underline">
                          <PriorityDot priority={p.priority} />
                          {p.name}
                        </Link>
                      </Td>
                      <Td className="tabular text-muted">{fmtDate(p.start_date)}</Td>
                      <Td className="tabular text-muted">{fmtDate(p.deadline)}</Td>
                      <Td>
                        <DaysLeft days={p.days_left} status={p.status} />
                      </Td>
                      <Td>
                        <Pill>{p.status}</Pill>
                      </Td>
                      <Td>
                        <TimelineTag tag={p.timeline_tag} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Section>

          <Section title={`Payments · ${payments.length}`}>
            {payments.length === 0 ? (
              <Empty message="No payments recorded yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Payment ID</Th>
                    <Th>Mode</Th>
                    <Th>Notes</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <Td className="tabular">{fmtDate(p.payment_date)}</Td>
                      <Td className="tabular text-muted">{p.payment_code}</Td>
                      <Td className="text-muted">{p.mode ?? "—"}</Td>
                      <Td className="max-w-56 truncate text-muted">{p.notes ?? ""}</Td>
                      <Td className="tabular text-right font-medium">{inr(p.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Section>
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <Stat label="Total received" value={inr(totalReceived)} sub={`${payments.length} payment${payments.length === 1 ? "" : "s"}`} />
          <div className="rounded-lg border border-line p-4">
            <Properties
              rows={[
                ["Contact", client.contact_person],
                ["Phone", client.phone ? <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a> : null],
                ["Email", client.email ? <a href={`mailto:${client.email}`} className="truncate hover:underline">{client.email}</a> : null],
                ["Source", client.source],
                ["Expected", client.expected_value != null ? <span className="tabular">{inr(client.expected_value)}</span> : null],
                ["Follow-up", client.follow_up_date ? <span className="tabular">{fmtDate(client.follow_up_date)}</span> : null],
                ...(client.status === "Lost" ? ([["Lost reason", client.lost_reason]] as [string, React.ReactNode][]) : []),
              ]}
            />
            {client.notes && (
              <div className="mt-3 border-t border-line pt-3 text-sm leading-relaxed whitespace-pre-wrap text-fg">{client.notes}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
