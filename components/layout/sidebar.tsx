"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LogOut, Menu } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PlanBadge } from "@/components/billing/plan-badge";

function AdFlowLogo({ collapsed, logoUrl }: { collapsed: boolean; logoUrl?: string | null }) {
  return (
    <div
      className={cn(
        "flex items-center h-14 px-4 border-b border-[color:var(--adflow-border)] shrink-0",
        collapsed ? "justify-center" : "gap-2"
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo" className={cn("object-contain shrink-0", collapsed ? "h-6 w-6" : "h-7 max-w-[120px]")} />
      ) : (
        <>
          <div className="w-6 h-6 rounded bg-[color:var(--adflow-accent)] shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-[color:var(--adflow-fg)] text-sm tracking-tight">
              AdFlow
            </span>
          )}
        </>
      )}
    </div>
  )
}

/* ── Desktop sidebar (md+) ── */
function DesktopSidebar({ logoUrl }: { logoUrl?: string | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => logout());
  }

  return (
    <TooltipProvider delay={0}>
      <aside
        aria-label="Main navigation"
        className={cn(
          "hidden md:flex flex-col h-screen bg-[color:var(--adflow-surface)] border-r border-[color:var(--adflow-border)] transition-all duration-200 shrink-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <AdFlowLogo collapsed={collapsed} logoUrl={logoUrl} />

        <SidebarNav collapsed={collapsed} />

        {/* Plan badge — links to billing page */}
        {!collapsed && (
          <Link
            href="/settings/billing"
            className="flex items-center justify-between px-3 py-2 mx-2 mb-1 rounded-md hover:bg-[color:var(--adflow-border)] transition-colors"
          >
            <span className="text-xs text-[color:var(--adflow-fg-muted)]">Plano atual</span>
            <PlanBadge plan="free" />
          </Link>
        )}

        <div className="shrink-0 p-2 border-t border-[color:var(--adflow-border)] flex flex-col gap-1">
          <button
            onClick={handleLogout}
            disabled={isPending}
            aria-label="Sair"
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-[color:var(--adflow-danger)] hover:bg-[color:var(--adflow-danger)]/10 transition-colors disabled:opacity-50",
              collapsed ? "justify-center" : ""
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{isPending ? "Saindo…" : "Sair"}</span>}
          </button>

          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

/* ── Mobile sidebar (hamburger → Sheet) ── */
export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    setOpen(false);
    startTransition(() => logout());
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="md:hidden p-2 rounded-md text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-64 p-0 bg-[color:var(--adflow-surface)] border-r border-[color:var(--adflow-border)]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navegação</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <AdFlowLogo collapsed={false} />
          <TooltipProvider delay={0}>
            <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
          </TooltipProvider>
          <div className="shrink-0 p-2 border-t border-[color:var(--adflow-border)]">
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-[color:var(--adflow-danger)] hover:bg-[color:var(--adflow-danger)]/10 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{isPending ? "Saindo…" : "Sair"}</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Default export: desktop sidebar ── */
export function Sidebar({ logoUrl }: { logoUrl?: string | null }) {
  return <DesktopSidebar logoUrl={logoUrl} />;
}
