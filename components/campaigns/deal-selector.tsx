"use client";

import { useState, useEffect } from "react";
import type { PmpDeal } from "@/types/database";

type DealSelectorProps = {
  workspaceId: string;
  value?: string | null;
  onSelect: (dealId: string | null) => void;
};

export default function DealSelector({
  workspaceId,
  value,
  onSelect,
}: DealSelectorProps) {
  const [deals, setDeals] = useState<PmpDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rtb/deals?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d: { deals?: PmpDeal[] }) => {
        const active = Array.isArray(d.deals)
          ? d.deals.filter((deal) => deal.status === "active")
          : [];
        setDeals(active);
      })
      .catch(() => {
        setDeals([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onSelect(val === "" ? null : val);
  }

  return (
    <select
      value={value ?? ""}
      onChange={handleChange}
      disabled={loading}
      className="w-full px-3 py-2 text-sm bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded-md text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)] transition disabled:opacity-50"
    >
      {loading ? (
        <option value="">Carregando deals...</option>
      ) : deals.length === 0 ? (
        <>
          <option value="">Selecionar deal...</option>
          <option value="" disabled>
            Nenhum deal disponível
          </option>
        </>
      ) : (
        <>
          <option value="">Selecionar deal...</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.deal_id}>
              {deal.deal_name} ({deal.deal_id})
            </option>
          ))}
        </>
      )}
    </select>
  );
}
