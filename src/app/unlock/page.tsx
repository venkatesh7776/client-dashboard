import { Brand } from "@/components/brand";
import { UnlockForm } from "./unlock-form";

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg px-4">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <Brand size={34} />
        </div>
        <UnlockForm next={next ?? "/"} />
      </div>
    </div>
  );
}
