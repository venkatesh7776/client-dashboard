"use client";

import {
  CaretLeft,
  CaretRight,
  CheckSquareOffset,
  CurrencyInr,
  House,
  Kanban,
  Moon,
  Sun,
  UsersThree,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { Brand } from "@/components/brand";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

const NAV: { href: string; label: string; icon: PhosphorIcon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/clients", label: "Clients", icon: UsersThree },
  { href: "/projects", label: "Projects", icon: Kanban },
  { href: "/payments", label: "Payments", icon: CurrencyInr },
  { href: "/todos", label: "To-dos", icon: CheckSquareOffset },
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
  const I = dark ? Sun : Moon;
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={dark ? "Light mode" : "Dark mode"}
      aria-label={dark ? "Light mode" : "Dark mode"}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg text-[15px] text-[var(--side-fg)] transition-colors hover:bg-hover hover:text-fg",
        compact ? "w-9 justify-center" : "w-full px-3",
      )}
    >
      <I size={20} weight="regular" className="shrink-0" />
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
        "sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-line bg-soft pt-4 pb-3 transition-[width] duration-150 md:flex",
        collapsed ? "w-[64px] items-center px-2" : "w-[248px] px-3",
      )}
    >
      {/* edge handle: small circle with an arrow, centred on the right edge */}
      <button
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-3 z-20 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-bg text-muted shadow-[0_1px_3px_rgba(15,15,15,0.1)] transition-colors hover:text-fg"
      >
        {collapsed ? <CaretRight size={12} weight="bold" /> : <CaretLeft size={12} weight="bold" />}
      </button>

      <Link href="/" aria-label="TrackMate home" className={cn("mb-6 flex h-9 items-center", collapsed ? "justify-center" : "px-2")}>
        <Brand size={30} showName={!collapsed} />
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg text-[15px] transition-colors",
                collapsed ? "w-10 justify-center" : "px-3",
                active ? "bg-active font-medium text-fg" : "text-[var(--side-fg)] hover:bg-hover hover:text-fg",
              )}
            >
              <Icon size={20} weight={active ? "fill" : "regular"} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
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
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-fg" : "text-faint")}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTopBar() {
  return (
    <div className="flex h-12 items-center justify-between border-b border-line px-4 md:hidden">
      <Link href="/" aria-label="TrackMate home">
        <Brand size={26} />
      </Link>
      <ThemeToggle compact />
    </div>
  );
}
