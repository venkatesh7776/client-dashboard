import Link from "next/link";
import { DeleteProjectButton } from "@/components/delete-buttons";
import { FilterBar } from "@/components/filter-bar";
import { AddProjectButton } from "@/components/panels";
import { DaysLeft, TimelineTag } from "@/components/project-bits";
import { ProjectStatusSelect } from "@/components/status-select";
import { InlineProjectDate, InlineProjectPriority } from "@/components/inline-edit";
import { Empty, PageHeader, Table, Td, Th } from "@/components/ui";
import { ViewTabs } from "@/components/view-tabs";
import { PRIORITIES, PROJECT_STATUSES, TIMELINE_TAGS } from "@/lib/constants";
import { getClientOptions, getProjects } from "@/lib/data";
import { ProjectsBoard } from "./projects-board";

type SP = Promise<Record<string, string | undefined>>;

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "board";
  const showClosed = sp.all === "1";
  const [projects, wonOptions, allClients] = await Promise.all([
    getProjects({ status: sp.status, priority: sp.priority, client: sp.client, tag: sp.tag, all: showClosed || view === "board" }),
    getClientOptions("closed"),
    getClientOptions("all"),
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${projects.filter((p) => !["Completed", "Cancelled"].includes(p.status)).length} open · ${projects.filter((p) => p.status === "Completed").length} completed · ${projects.filter((p) => p.timeline_tag === "Overdue" || p.timeline_tag === "Due Soon").length} due this week · ${projects.filter((p) => !p.deadline && !["Completed", "Cancelled"].includes(p.status)).length} without a deadline`}
        actions={<AddProjectButton clientOptions={wonOptions} />} />
      <ViewTabs base="/projects" view={view} params={sp} />
      <FilterBar
        filters={[
          ...(view === "table" ? [{ key: "status", label: "Status", options: [...PROJECT_STATUSES] }] : []),
          { key: "priority", label: "Priority", options: [...PRIORITIES] },
          { key: "client", label: "Client", options: allClients.map((o) => ({ value: o.label.split(" · ")[0], label: o.label })) },
          { key: "tag", label: "Timeline", options: [...TIMELINE_TAGS] },
        ]}
        toggles={view === "table" ? [{ key: "all", label: "Show completed & cancelled" }] : []}
      />

      {view === "board" ? (
        <ProjectsBoard projects={projects} />
      ) : projects.length === 0 ? (
        <Empty
          message={wonOptions.length ? "No projects here yet." : "No projects yet. Mark a client as Closed and its project is created for you."}
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
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="group">
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
                <Td className="text-muted">
                  <InlineProjectDate key={`s${p.start_date}`} id={p.id} field="start_date" value={p.start_date} max={p.deadline} />
                </Td>
                <Td>
                  <InlineProjectDate key={`d${p.deadline}`} id={p.id} field="deadline" value={p.deadline} min={p.start_date} />
                </Td>
                <Td>
                  <DaysLeft days={p.days_left} status={p.status} />
                </Td>
                <Td>
                  <InlineProjectPriority key={p.priority} id={p.id} value={p.priority} />
                </Td>
                <Td>
                  <ProjectStatusSelect key={p.status} id={p.id} status={p.status} />
                </Td>
                <Td>
                  <TimelineTag tag={p.timeline_tag} noDeadline={!p.deadline && !["Completed", "Cancelled"].includes(p.status)} />
                </Td>
                <Td className="w-10 px-1">
                  <DeleteProjectButton id={p.id} label={`${p.project_code} · ${p.name}`} icon />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
