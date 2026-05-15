"use client";

import { LogOut, Settings, User, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MOCK_USER = {
  name: "Victor Coimbra",
  email: "victor@agencia.com",
  plan: "Agency",
  initials: "VC",
};

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="User menu"
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--adflow-accent)]"
      >
        <Avatar className="w-7 h-7">
          <AvatarFallback className="bg-[color:var(--adflow-accent)]/20 text-[color:var(--adflow-accent)] text-xs font-semibold">
            {MOCK_USER.initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60 bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)]">
        <DropdownMenuLabel className="font-normal pb-2">
          <p className="text-sm font-medium text-[color:var(--adflow-fg)]">
            {MOCK_USER.name}
          </p>
          <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5">
            {MOCK_USER.email}
          </p>
          <span className="mt-1.5 inline-block text-[10px] bg-[color:var(--adflow-accent)]/10 text-[color:var(--adflow-accent)] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
            {MOCK_USER.plan}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[color:var(--adflow-border)]" />

        <DropdownMenuItem className="gap-2 text-[color:var(--adflow-fg)] cursor-pointer">
          <User className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-[color:var(--adflow-fg)] cursor-pointer">
          <Settings className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-[color:var(--adflow-fg)] cursor-pointer">
          <CreditCard className="w-3.5 h-3.5 text-[color:var(--adflow-fg-muted)]" />
          Billing
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[color:var(--adflow-border)]" />

        <DropdownMenuItem className="gap-2 text-[color:var(--adflow-danger)] cursor-pointer">
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
