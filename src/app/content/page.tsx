import Link from "next/link";
import { ContentBoard, QuickIdea } from "@/components/content/content-board";
import { FilterBar } from "@/components/filter-bar";
import { Empty, PageHeader, Pill, Table, Td, Th } from "@/components/ui";
import { ViewTabs } from "@/components/view-tabs";
import { CONTENT_PLATFORMS, CONTENT_STATUSES } from "@/lib/constants";
import { getContent, getContentPillars } from "@/lib/data";
import { fmtDate } from "@/lib/dates";
import { reelLength } from "@/lib/format";

type SP = Promise<Record<string, string | undefined>>;

export default async function ContentPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "board";
  const [items, pillars, all] = await Promise.all([
    getContent({ q: sp.q, status: view === "table" ? sp.status : undefined, pillar: sp.pillar, platform: sp.platform }),
    getContentPillars(),
    getContent(),
  ]);
  const filtered = !!(sp.q || sp.pillar || sp.platform || (view === "table" && sp.status));

  const ideas = all.filter((c) => c.status === "Idea").length;
  const scripting = all.filter((c) => c.status === "Scripting").length;
  const ready = all.filter((c) => c.status === "Ready to shoot").length;

  return (
    <>
      <PageHeader title="Content" description={`${ideas} ideas · ${scripting} scripting · ${ready} ready to shoot`} />
      <QuickIdea />
      <ViewTabs base="/content" view={view} params={sp} />
      <FilterBar
        search="Search titles and scripts"
        filters={[
          ...(view === "table" ? [{ key: "status", label: "Status", options: [...CONTENT_STATUSES] }] : []),
          ...(pillars.length ? [{ key: "pillar", label: "Pillar", options: pillars }] : []),
          { key: "platform", label: "Platform", options: [...CONTENT_PLATFORMS] },
        ]}
      />

      {view === "board" ? (
        <ContentBoard items={items} />
      ) : items.length === 0 ? (
        <Empty message={filtered ? "Nothing matches these filters." : "No content yet. Type your first idea above."} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Pillar</Th>
              <Th>Platform</Th>
              <Th>Length</Th>
              <Th>Post on</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <Td className="tabular text-muted">{c.content_code}</Td>
                <Td className="max-w-[360px]">
                  <Link href={`/content/${c.content_code}`} className="block truncate font-medium hover:underline">
                    {c.title}
                  </Link>
                </Td>
                <Td>
                  <Pill>{c.status}</Pill>
                </Td>
                <Td className="text-muted">{c.pillar ?? "—"}</Td>
                <Td className="text-muted">{c.platform}</Td>
                <Td className="tabular text-muted">{reelLength(c.script)?.label ?? "—"}</Td>
                <Td className="tabular text-muted">{fmtDate(c.planned_date)}</Td>
                <Td className="tabular text-muted">{fmtDate(c.updated_at.slice(0, 10))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
