"use client";

import { useState } from "react";
import { ChevronDown, Check, Building2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type OrgSwitcherProps = { orgName?: string | null };

export function OrgSwitcher({ orgName }: OrgSwitcherProps = {}) {
  return (
    <div className="inline-flex items-center gap-2 h-8 px-2 rounded-md text-sm text-[color:var(--adflow-fg-muted)] max-w-[200px]">
      <Building2 className="w-3.5 h-3.5 shrink-0 text-[color:var(--adflow-accent)]" />
      <span className="truncate font-medium text-[color:var(--adflow-fg)]">{orgName ?? "Minha Organização"}</span>
    </div>
  );
}