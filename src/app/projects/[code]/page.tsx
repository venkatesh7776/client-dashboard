import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectFiles } from "@/components/project-files";
import { TimelineTag } from "@/components/project-bits";
import { Properties } from "@/components/property-list";
import { ProjectStatusSelect } from "@/components/status-select";
import { TodoList } from "@/components/todo-list";
import { InlineProjectDate, InlineProjectPriority } from "@/components/inline-edit";
import { Empty, Section, Stat } from "@/components/ui";
import { getClientOptions, getProjectByCode, getProjectFiles, getProjectTodos } from "@/lib/data";
import { fmtDate, todayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { ProjectActions } from "./project-actions";

export default async function ProjectDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const project = await getProjectByCode(decodeURIComponent(code));
  if (!project) notFound();
  const [todos, wonOptions, files] = await Promise.all([
    getProjectTodos(project.id),
    getClientOptions("closed"),
    getProjectFiles(project.id),
  ]);
  const today = todayIST();
  const closed = ["Completed", "Cancelled"].includes(project.status);

  const d = project.days_until_start;
  const startLabel = !project.start_date ? "Not set" : d === null ? "Started" : d > 0 ? `in ${d}d` : d === 0 ? "Today" : `${-d}d ago`;
  const left = project.days_left;
  const leftLabel = left === null ? "Not set" : closed ? "—" : left < 0 ? `${-left}d overdue` : left === 0 ? "Due today" : `${left}d`;

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft size={14} /> Projects
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="tabular text-[13px] text-muted">{project.project_code}</div>
          <h1 className="mt-0.5 text-[30px] leading-tight font-bold tracking-[-0.02em] sm:text-[36px]">{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ProjectStatusSelect key={project.status} id={project.id} status={project.status} />
            {!closed && <TimelineTag tag={project.timeline_tag} noDeadline={!project.deadline} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProjectActions project={project} clientOptions={wonOptions} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Duration" value={project.duration_days ? `${project.duration_days}d` : "—"} />
        <Stat label="Starts" value={startLabel} sub={project.start_date ? fmtDate(project.start_date) : "Add a start date"} />
        <Stat label="Days left" value={leftLabel} sub={project.deadline ? fmtDate(project.deadline) : "Add a deadline"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Section title="Description">
            {project.notes ? (
              <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{project.notes}</div>
            ) : (
              <p className="px-4 py-3 text-sm text-faint">No description yet. Use Edit to add scope, links and terms.</p>
            )}
          </Section>
          <Section title={`Documents · ${files.length}`}>
            <ProjectFiles projectId={project.id} files={files} />
          </Section>
          <Section title={`Linked to-dos · ${todos.length}`}>
            {todos.length === 0 ? <Empty message="No to-dos linked. Link one from the To-do board's edit panel." /> : <TodoList todos={todos} today={today} />}
          </Section>
        </div>
        <div className="h-fit rounded-lg border border-line p-4">
          <Properties
            rows={[
              [
                "Client",
                <Link key="c" href={`/clients/${project.client_code}`} className="truncate hover:underline">
                  <span className="tabular text-muted">{project.client_code}</span> · {project.client_name}
                </Link>,
              ],
              ["Start date", <InlineProjectDate key={`s${project.start_date}`} id={project.id} field="start_date" value={project.start_date} max={project.deadline} />],
              ["Deadline", <InlineProjectDate key={`d${project.deadline}`} id={project.id} field="deadline" value={project.deadline} min={project.start_date} />],
              ["Priority", <InlineProjectPriority key={`p${project.priority}`} id={project.id} value={project.priority} />],
              ["Value", project.value != null ? <span className="tabular">{inr(project.value)}</span> : null],
            ]}
          />
        </div>
      </div>
    </>
  );
}
