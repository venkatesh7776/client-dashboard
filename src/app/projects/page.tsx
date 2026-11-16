import Link from "next/link";
import { FilterBar } from "@/components/filter-bar";
import { AddProjectButton } from "@/components/panels";
import { DaysLeft, TimelineTag } from "@/components/project-bits";
import { ProjectStatusSelect } from "@/components/status-select";
import { Empty, PageHeader, PriorityDot, Table, Td, Th } from "@/components/ui";
import { PRIORITIES, PROJECT_STATUSES, TIMELINE_TAGS } from "@/lib/constants";
import { getClientOptions, getProjects } from "@/lib/data";
import { fmtDate } from "@/lib/dates";

type SP = Promise<Record<string, string | undefined>>;

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [projects, wonOptions, allClients] = await Promise.all([
    getProjects({ status: sp.status, priority: sp.priority, client: sp.client, tag: sp.tag, all: sp.all === "1" }),
    getClientOptions("won"),
    getClientOptions("all"),
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="When to start, and when it's due."
        actions={<AddProjectButton clientOptions={wonOptions} />}
      />
      <FilterBar
        filters={[
          { key: "status", label: "Status", options: [...PROJECT_STATUSES] },
          { key: "priority", label: "Priority", options: [...PRIORITIES] },
          { key: "client", label: "Client", options: allClients.map((o) => ({ value: o.label.split(" · ")[0], label: o.label })) },
          { key: "tag", label: "Timeline", options: [...TIMELINE_TAGS] },
        ]}
        toggles={[{ key: "all", label: "Show completed & cancelled" }]}
      />

      {projects.length === 0 ? (
        <Empty
          message={wonOptions.length ? "No projects here yet." : "No projects yet. Mark a client as Won, then add a project."}
          action={<AddProjectButton clientOptions={wonOptions} label="Add project" urlDriven={false} />}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Project ID</Th>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Start</Th>
              <Th>Deadline</Th>
              <Th>Days left</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Timeline</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <Td className="tabular text-muted">{p.project_code}</Td>
                <Td>
                  <Link href={`/projects/${p.project_code}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/clients/${p.client_code}`} className="hover:underline">
                    <span className="tabular text-muted">{p.client_code}</span> {p.client_name}
                  </Link>
                </Td>
                <Td className="tabular text-muted">{fmtDate(p.start_date)}</Td>
                <Td className="tabular">{fmtDate(p.deadline)}</Td>
                <Td>
                  <DaysLeft days={p.days_left} status={p.status} />
                </Td>
                <Td>
                  <PriorityDot priority={p.priority} withLabel />
                </Td>
                <Td>
                  <ProjectStatusSelect key={p.status} id={p.id} status={p.status} />
                </Td>
                <Td>
                  <TimelineTag tag={p.timeline_tag} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
