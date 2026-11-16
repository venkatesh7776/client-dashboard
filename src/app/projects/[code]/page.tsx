import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TodoList } from "@/components/todo-list";
import { TimelineTag } from "@/components/project-bits";
import { Properties } from "@/components/property-list";
import { ProjectStatusSelect } from "@/components/status-select";
import { Empty, PriorityDot, Section, Stat } from "@/components/ui";
import { getClientOptions, getProjectByCode, getProjectTodos } from "@/lib/data";
import { fmtDate, todayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { ProjectActions } from "./project-actions";

export default async function ProjectDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const project = await getProjectByCode(decodeURIComponent(code));
  if (!project) notFound();
  const [todos, wonOptions] = await Promise.all([getProjectTodos(project.id), getClientOptions("won")]);
  const today = todayIST();

  const startLabel =
    project.days_until_start === null
      ? "—"
      : project.days_until_start > 0
        ? `in ${project.days_until_start}d`
        : project.days_until_start === 0
          ? "Today"
          : `${-project.days_until_start}d ago`;
  const leftLabel = project.days_left < 0 ? `${-project.days_left}d overdue` : project.days_left === 0 ? "Due today" : `${project.days_left}d`;

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft size={14} /> Projects
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="tabular text-[13px] text-muted">{project.project_code}</div>
          <h1 className="mt-0.5 text-[28px] font-bold tracking-tight sm:text-[32px]">{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ProjectStatusSelect key={project.status} id={project.id} status={project.status} />
            {project.timeline_tag && <TimelineTag tag={project.timeline_tag} />}
          </div>
        </div>
        <ProjectActions project={project} clientOptions={wonOptions} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Duration" value={`${project.duration_days}d`} />
        <Stat label="Starts" value={startLabel} sub={project.status === "Not Started" ? fmtDate(project.start_date) : "Started"} />
        <Stat label="Days left" value={leftLabel} sub={fmtDate(project.deadline)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-line p-4">
          <Properties
            rows={[
              [
                "Client",
                <Link key="c" href={`/clients/${project.client_code}`} className="hover:underline">
                  <span className="tabular text-muted">{project.client_code}</span> · {project.client_name}
                </Link>,
              ],
              ["Start date", <span key="s" className="tabular">{fmtDate(project.start_date)}</span>],
              ["Deadline", <span key="d" className="tabular">{fmtDate(project.deadline)}</span>],
              ["Priority", <PriorityDot key="p" priority={project.priority} withLabel />],
              ["Value", project.value != null ? <span className="tabular">{inr(project.value)}</span> : null],
            ]}
          />
          {project.notes && (
            <div className="mt-3 border-t border-line pt-3 text-sm leading-relaxed whitespace-pre-wrap">{project.notes}</div>
          )}
        </div>
        <Section title={`Linked to-dos · ${todos.length}`}>
          {todos.length === 0 ? (
            <Empty message="No to-dos linked. Link one from the To-do board's edit panel." />
          ) : (
            <TodoList todos={todos} today={today} />
          )}
        </Section>
      </div>
    </>
  );
}
