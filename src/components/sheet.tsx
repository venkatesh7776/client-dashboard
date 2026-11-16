"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Side panel over the current page (list stays visible behind it). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-black/20 dark:bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className="animate-slide-in absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-line bg-bg shadow-[0_0_0_1px_rgba(15,15,15,0.04),0_8px_32px_rgba(15,15,15,0.12)]"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}
