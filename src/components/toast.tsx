"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Toast = { id: number; message: string; link?: { href: string; label: string } };

/** Fire a small confirmation at the bottom of the screen. */
export function notify(message: string, link?: Toast["link"]) {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>("app-toast", { detail: { message, link } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = { id: Date.now() + Math.random(), ...(e as CustomEvent<Omit<Toast, "id">>).detail };
      setToasts((xs) => [...xs, t]);
      setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== t.id)), 7000);
    };
    window.addEventListener("app-toast", on);
    return () => window.removeEventListener("app-toast", on);
  }, []);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="animate-fade-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-md bg-[#2f2f2f] py-2 pr-2 pl-3 text-[13px] text-white shadow-lg dark:bg-[#373737]">
          <Check size={14} className="shrink-0 text-[#7bc092]" />
          <span>{t.message}</span>
          {t.link && (
            <Link href={t.link.href} className="shrink-0 font-medium underline underline-offset-2">
              {t.link.label}
            </Link>
          )}
          <button onClick={() => setToasts((xs) => xs.filter((x) => x.id !== t.id))} className="rounded p-0.5 text-white/60 hover:text-white" aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
