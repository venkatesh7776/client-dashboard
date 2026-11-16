import { Columns3, Table2 } from "lucide-react";
import Link from "next/link";
import { FilterBar } from "@/components/filter-bar";
import { AddClientButton } from "@/components/panels";
import { Empty, PageHeader, Pill, Table, Td, Th } from "@/components/ui";
import { CLIENT_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { getClientOptions, getClients } from "@/lib/data";
import { fmtDate, todayIST } from "@/lib/dates";
import { cn, inr } from "@/lib/format";
import { ClientsBoard } from "./clients-board";

type SP = Promise<Record<string, string | undefined>>;

export default async function ClientsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "board";
  const showLost = sp.lost === "1";
  const today = todayIST();
  const [clients, wonOptions] = await Promise.all([
    getClients({ q: sp.q, status: sp.status, source: sp.source, showLost }),
    getClientOptions("won"),
  ]);
  const visible = clients;

  const tab = (v: string) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    p.set("view", v);
    return `/clients?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Clients & Leads"
        description="Every lead and client in one place."
        actions={<AddClientButton wonOptions={wonOptions} />}
      />

      <div className="mb-3 flex items-center gap-1 border-b border-line">
        {[
          { v: "board", label: "Board", icon: Columns3 },
          { v: "table", label: "Table", icon: Table2 },
        ].map(({ v, label, icon: Icon }) => (
          <Link
            key={v}
            href={tab(v)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-2 pb-2 text-sm",
              view === v ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </div>

      <FilterBar
        search="Search name or Client ID"
        filters={[
          ...(view === "table" ? [{ key: "status", label: "Status", options: [...CLIENT_STATUSES] }] : []),
          { key: "source", label: "Source", options: [...LEAD_SOURCES] },
        ]}
        toggles={[{ key: "lost", label: "Show lost" }]}
      />

      {view === "board" ? (
        <ClientsBoard clients={visible} today={today} showLost={showLost} wonOptions={wonOptions} />
      ) : visible.length === 0 ? (
        <Empty message="No clients match. Add your first lead to get started." action={<AddClientButton wonOptions={wonOptions} label="Add client" />} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Client ID</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Source</Th>
              <Th>Follow-up</Th>
              <Th className="text-right">Expected value</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const due = c.follow_up_date && c.follow_up_date <= today && c.status !== "Lost";
              return (
                <tr key={c.id} className="group">
                  <Td className="tabular text-muted">{c.client_code}</Td>
                  <Td>
                    <Link href={`/clients/${c.client_code}`} className="font-medium underline-offset-2 hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>
                    <Pill>{c.status}</Pill>
                  </Td>
                  <Td className="text-muted">{c.source ?? "—"}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className={cn("tabular", !c.follow_up_date && "text-faint")}>{fmtDate(c.follow_up_date)}</span>
                      {due && <Pill tone="orange">Follow up</Pill>}
                    </span>
                  </Td>
                  <Td className="tabular text-right">{inr(c.expected_value)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
