"use client";

import { CheckSquare, ChevronLeft, ChevronRight, FolderKanban, Home, IndianRupee, Moon, Sun, Users } from "lucide-react";
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
        "flex h-7 items-center gap-2 rounded-[5px] text-[14px] text-[var(--side-fg)] hover:bg-hover hover:text-fg",
        compact ? "w-8 justify-center" : "w-full px-2",
      )}
    >
      {dark ? <Sun size={16} strokeWidth={1.6} className="text-faint" /> : <Moon size={16} strokeWidth={1.6} className="text-faint" />}
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
        "group/side sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-soft pt-3 pb-2 transition-[width] duration-150 md:flex",
        collapsed ? "w-[52px] items-center px-2" : "w-[232px] px-2",
      )}
    >
      {/* edge handle: small circle with an arrow, centred on the right edge */}
      <button
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-[11px] z-20 grid size-[22px] -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-bg text-muted shadow-[0_1px_3px_rgba(15,15,15,0.08)] transition-colors hover:text-fg"
      >
        {collapsed ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronLeft size={13} strokeWidth={2} />}
      </button>

      <div className={cn("mb-3 flex h-7 items-center", collapsed ? "justify-center" : "px-2")}>
        {collapsed ? (
          <span className="text-[13px] font-semibold tracking-tight text-fg">CD</span>
        ) : (
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-fg">Client Desk</span>
        )}
      </div>
      <nav className="flex flex-col gap-[1px]">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={cn(
              "flex h-7 items-center gap-2 rounded-[5px] text-[14px] transition-colors",
              collapsed ? "w-8 justify-center" : "px-2",
              isActive(href) ? "bg-active font-medium text-fg" : "text-[var(--side-fg)] hover:bg-hover hover:text-fg",
            )}
          >
            <Icon size={16} strokeWidth={1.6} className={cn("shrink-0", isActive(href) ? "text-fg" : "text-faint")} />
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
      <span className="text-[14px] font-semibold tracking-[-0.01em]">Client Desk</span>
      <ThemeToggle compact />
    </div>
  );
}
