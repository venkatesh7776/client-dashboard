import { UnlockForm } from "./unlock-form";

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg px-4">
      <div className="w-full max-w-xs">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-[6px] bg-accent text-[13px] font-bold text-accent-fg">C</div>
          <span className="font-semibold">Client Desk</span>
        </div>
        <UnlockForm next={next ?? "/"} />
      </div>
    </div>
  );
}
