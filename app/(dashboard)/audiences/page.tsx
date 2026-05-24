"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AudiencesListClient } from "@/components/audiences/audiences-list-client";
import { CreateAudienceDialog } from "@/components/audiences/create-audience-dialog";
import { MOCK_AUDIENCES } from "@/lib/rtb/mock-data";

export default function AudiencesPage() {
  const audiences = MOCK_AUDIENCES;

  const totalSize = audiences.reduce((sum, a) => sum + a.size_estimate, 0);
  const withRules = audiences.filter((a) => a.rules.length > 0).length;

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Audiências</h1>
          <p className="text-sm text-muted mt-1">
            Segmentos comportamentais para campanhas programáticas
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Nova Audiência
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Total de Audiências</p>
          <p className="text-2xl font-bold text-white mt-1">{audiences.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Tamanho Total Estimado</p>
          <p className="text-2xl font-bold text-data mt-1">
            ~{new Intl.NumberFormat("pt-BR").format(totalSize)} usuários
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">Com Regras Ativas</p>
          <p className="text-2xl font-bold text-success mt-1">{withRules}</p>
        </div>
      </div>

      {/* Audiences list */}
      <AudiencesListClient audiences={audiences} />

      {/* Create dialog */}
      <CreateAudienceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          // TODO(M8-backend): refresh data from Supabase
        }}
      />
    </div>
  );
}
