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
import { Button } from "@/components/ui/button";

type Workspace = { id: string; name: string; plan: string };

const MOCK_WORKSPACES: Workspace[] = [
  { id: "1", name: "Agência Exemplo",  plan: "Agency" },
  { id: "2", name: "Cliente Demo",     plan: "Pro" },
  { id: "3", name: "E-commerce BR",    plan: "Pro" },
];

export function OrgSwitcher() {
  const [selected, setSelected] = useState<Workspace>(MOCK_WORKSPACES[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sm text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] max-w-[200px] h-8 px-2"
        >
          <Building2 className="w-3.5 h-3.5 shrink-0 text-[color:var(--adflow-accent)]" />
          <span className="truncate font-medium text-[color:var(--adflow-fg)]">
            {selected.name}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56 bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)]"
      >
        <DropdownMenuLabel className="text-[color:var(--adflow-fg-muted)] text-xs font-normal uppercase tracking-wide">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[color:var(--adflow-border)]" />

        {MOCK_WORKSPACES.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setSelected(ws)}
            className="flex items-center justify-between text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] cursor-pointer focus:bg-[color:var(--adflow-border)]"
          >
            <div className="flex flex-col">
              <span className="text-sm">{ws.name}</span>
              <span className="text-xs text-[color:var(--adflow-fg-muted)]">
                {ws.plan}
              </span>
            </div>
            {selected.id === ws.id && (
              <Check className="w-3.5 h-3.5 text-[color:var(--adflow-accent)]" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-[color:var(--adflow-border)]" />
        <DropdownMenuItem className="gap-2 text-[color:var(--adflow-fg-muted)] hover:bg-[color:var(--adflow-border)] cursor-pointer focus:bg-[color:var(--adflow-border)]">
          <Plus className="w-3.5 h-3.5" />
          <span className="text-sm">Novo workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
