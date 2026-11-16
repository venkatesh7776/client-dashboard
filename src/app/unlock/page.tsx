import Image from "next/image";
import { UnlockForm } from "./unlock-form";

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg px-4">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <Image src="/trackmate-logo.png" alt="TrackMate" width={149} height={32} priority className="dark:invert" />
        </div>
        <UnlockForm next={next ?? "/"} />
      </div>
    </div>
  );
}
