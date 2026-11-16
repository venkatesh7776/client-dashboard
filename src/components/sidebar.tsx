"use client";

import { CheckSquare, FolderKanban, Home, IndianRupee, Moon, Sun, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/payments", label: "Payments", icon: IndianRupee },
  { href: "/todos", label: "To-dos", icon: CheckSquare },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex h-[30px] w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted hover:bg-hover hover:text-fg"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function Sidebar() {
  const isActive = useActive();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-soft px-2 py-3 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="grid size-6 place-items-center rounded-[5px] bg-accent text-[12px] font-bold text-accent-fg">C</div>
        <span className="text-sm font-semibold">Client Desk</span>
      </div>
      <nav className="flex flex-col gap-px">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-[30px] items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
              isActive(href) ? "bg-active font-medium text-fg" : "text-muted hover:bg-hover hover:text-fg",
            )}
          >
            <Icon size={16} strokeWidth={isActive(href) ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function BottomBar() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 text-[11px]",
            isActive(href) ? "text-fg" : "text-faint",
          )}
        >
          <Icon size={19} strokeWidth={isActive(href) ? 2.2 : 1.8} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileTopBar() {
  return (
    <div className="flex h-12 items-center justify-between border-b border-line px-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid size-6 place-items-center rounded-[5px] bg-accent text-[12px] font-bold text-accent-fg">C</div>
        <span className="text-sm font-semibold">Client Desk</span>
      </div>
      <div className="w-32">
        <ThemeToggle />
      </div>
    </div>
  );
}
