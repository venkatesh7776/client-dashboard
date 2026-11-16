"use client";

import { CheckSquare, FolderKanban, Home, IndianRupee, Moon, PanelLeftClose, PanelLeftOpen, Sun, Users } from "lucide-react";
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

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={dark ? "Light mode" : "Dark mode"}
      aria-label={dark ? "Light mode" : "Dark mode"}
      className={cn(
        "flex h-[30px] items-center gap-2.5 rounded-md text-sm text-muted hover:bg-hover hover:text-fg",
        compact ? "w-[30px] justify-center" : "w-full px-2",
      )}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && (dark ? "Light mode" : "Dark mode")}
    </button>
  );
}

const KEY = "sidebar-collapsed";

export function Sidebar() {
  const isActive = useActive();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);
  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-soft py-3 transition-[width] duration-150 md:flex",
        collapsed ? "w-[52px] items-center px-1.5" : "w-60 px-2",
      )}
    >
      <div className={cn("mb-4 flex items-center gap-2", collapsed ? "flex-col" : "px-2")}>
        <div className="grid size-6 shrink-0 place-items-center rounded-[5px] bg-accent text-[12px] font-bold text-accent-fg">C</div>
        {!collapsed && <span className="text-sm font-semibold">Client Desk</span>}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("rounded-md p-1 text-faint hover:bg-hover hover:text-fg", !collapsed && "ml-auto")}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <nav className="flex flex-col gap-px">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={cn(
              "flex h-[30px] items-center gap-2.5 rounded-md text-sm transition-colors",
              collapsed ? "w-[34px] justify-center" : "px-2",
              isActive(href) ? "bg-active font-medium text-fg" : "text-muted hover:bg-hover hover:text-fg",
            )}
          >
            <Icon size={16} strokeWidth={isActive(href) ? 2.2 : 1.8} />
            {!collapsed && label}
          </Link>
        ))}
      </nav>
      <div className={cn("mt-auto", !collapsed && "w-full")}>
        <ThemeToggle compact={collapsed} />
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
      <ThemeToggle compact />
    </div>
  );
}
