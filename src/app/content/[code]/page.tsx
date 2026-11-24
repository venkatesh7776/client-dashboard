import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentEditor } from "@/components/content/content-editor";
import { getContentByCode, getContentPillars } from "@/lib/data";

export default async function ContentDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [item, pillars] = await Promise.all([getContentByCode(decodeURIComponent(code)), getContentPillars()]);
  if (!item) notFound();
  return (
    <>
      <Link href="/content" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
        <ChevronLeft size={14} /> Content
      </Link>
      <ContentEditor key={item.id} item={item} pillars={pillars} />
    </>
  );
}
