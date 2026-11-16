import Link from "next/link";
import { DeleteClientButton } from "@/components/delete-buttons";
import { FilterBar } from "@/components/filter-bar";
import { AddClientButton } from "@/components/panels";
import { ViewTabs } from "@/components/view-tabs";
import { Empty, PageHeader, Pill, Table, Td, Th } from "@/components/ui";
import { CLIENT_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { getClients } from "@/lib/data";
import { fmtDate, todayIST } from "@/lib/dates";
import { cn, inr } from "@/lib/format";
import { ClientsBoard } from "./clients-board";

type SP = Promise<Record<string, string | undefined>>;

export default async function ClientsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "board";
  const showLost = sp.lost === "1";
  const today = todayIST();
  const clients = await getClients({ q: sp.q, status: sp.status, source: sp.source, showLost });
  const visible = clients;

  return (
    <>
      <PageHeader
        title="Clients & Leads"
        description="Every lead and client in one place."
        actions={<AddClientButton />}
      />

      <ViewTabs base="/clients" view={view} params={sp} />

      <FilterBar
        search="Search name or Client ID"
        filters={[
          ...(view === "table" ? [{ key: "status", label: "Status", options: [...CLIENT_STATUSES] }] : []),
          { key: "source", label: "Source", options: [...LEAD_SOURCES] },
        ]}
        toggles={[{ key: "lost", label: "Show lost" }]}
      />

      {view === "board" ? (
        <ClientsBoard clients={visible} today={today} showLost={showLost} />
      ) : visible.length === 0 ? (
        <Empty message="No clients match. Add your first lead to get started." action={<AddClientButton label="Add client" />} />
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
              <Th className="w-10" />
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
                  <Td className="w-10 px-1">
                    <DeleteClientButton id={c.id} label={`${c.client_code} · ${c.name}`} icon />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
