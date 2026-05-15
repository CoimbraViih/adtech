"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
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

function AdFlowLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center h-14 px-4 border-b border-[color:var(--adflow-border)] shrink-0",
        collapsed ? "justify-center" : "gap-2"
      )}
    >
      <div className="w-6 h-6 rounded bg-[color:var(--adflow-accent)] shrink-0" />
      {!collapsed && (
        <span className="font-semibold text-[color:var(--adflow-fg)] text-sm tracking-tight">
          AdFlow
        </span>
      )}
    </div>
  );
}

/* ── Desktop sidebar (md+) ── */
function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        aria-label="Main navigation"
        className={cn(
          "hidden md:flex flex-col h-screen bg-[color:var(--adflow-surface)] border-r border-[color:var(--adflow-border)] transition-all duration-200 shrink-0",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <AdFlowLogo collapsed={collapsed} />

        <SidebarNav collapsed={collapsed} />

        <div className="shrink-0 p-2 border-t border-[color:var(--adflow-border)]">
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-md text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 bg-[color:var(--adflow-surface)] border-r border-[color:var(--adflow-border)]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navegação</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <AdFlowLogo collapsed={false} />
          <TooltipProvider delayDuration={0}>
            <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
          </TooltipProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Default export: desktop sidebar ── */
export function Sidebar() {
  return <DesktopSidebar />;
}
