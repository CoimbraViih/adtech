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

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors select-none",
        collapsed ? "justify-center" : "",
        active
          ? "bg-[color:var(--adflow-accent)]/10 text-[color:var(--adflow-accent)] font-medium"
          : "text-[color:var(--adflow-fg-muted)] hover:bg-[color:var(--adflow-border)] hover:text-[color:var(--adflow-fg)]"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
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
