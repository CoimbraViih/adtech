"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

function NavLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const linkClasses = cn(
    "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors select-none w-full",
    collapsed ? "justify-center" : "",
    active
      ? "bg-[color:var(--adflow-accent)]/10 text-[color:var(--adflow-accent)] font-medium"
      : "text-[color:var(--adflow-fg-muted)] hover:bg-[color:var(--adflow-border)] hover:text-[color:var(--adflow-fg)]"
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={item.href}
              onClick={onNavigate}
              className={linkClasses}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
            </Link>
          }
        />
        <TooltipContent
          side="right"
          className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] text-xs"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={linkClasses}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const isExcluded = item.excludePrefixes?.some((p) => pathname.startsWith(p)) ?? false;
        const active = !isExcluded && (item.matchPrefix
          ? pathname.startsWith(item.href)
          : pathname === item.href || pathname.startsWith(item.href + "/"));
        return (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
