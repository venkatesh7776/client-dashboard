import { Outfit } from "next/font/google";
import Image from "next/image";
import { cn } from "@/lib/format";

const outfit = Outfit({ subsets: ["latin"], weight: ["600"], display: "swap" });

/** TrackMate brand: the running-man mark + a plain black wordmark (white in dark mode). */
export function Brand({ size = 28, showName = true, className }: { size?: number; showName?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/trackmate-mark.png"
        alt={showName ? "" : "TrackMate"}
        width={size}
        height={size}
        priority
        className="shrink-0 rounded-[22%]"
      />
      {showName && (
        <span
          className={cn(outfit.className, "leading-none tracking-[-0.02em] text-[#111111] dark:text-white")}
          style={{ fontSize: Math.round(size * 0.7) }}
        >
          TrackMate
        </span>
      )}
    </span>
  );
}
