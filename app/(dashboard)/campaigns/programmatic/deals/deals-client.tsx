"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PmpDeal, PmpDealType, PmpDealStatus } from "@/types/database";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(price: number) {
  return `R$ ${price.toFixed(2)}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

const DEAL_TYPE_LABELS: Record<PmpDealType, string> = {
  private: "Privado",
  preferred: "Preferencial",
  guaranteed: "Garantido",
};

const DEAL_TYPE_CLASSES: Record<PmpDealType, string> = {
  private: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  preferred: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  guaranteed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const STATUS_LABELS: Record<PmpDealStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  expired: "Expirado",
};

const STATUS_CLASSES: Record<PmpDealStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  expired: "bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] border-[color:var(--adflow-border)]",
};

// ─── Inline Badge ─────────────────────────────────────────────────────────────

function StatusPill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {children}
    </span>
  );
}

// ─── New Deal Form ────────────────────────────────────────────────────────────

type DealFormState = {
  deal_id: string;
  deal_name: string;
  deal_type: PmpDealType;
  floor_price: string;
  publisher_name: string;
  start_date: string;
  end_date: string;
};

const DEFAULT_FORM: DealFormState = {
  deal_id: "",
  deal_name: "",
  deal_type: "private",
  floor_price: "",
  publisher_name: "",
  start_date: "",
  end_date: "",
};

function NewDealDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DealFormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(field: keyof DealFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body = {
      deal_id: form.deal_id.trim(),
      deal_name: form.deal_name.trim(),
      deal_type: form.deal_type,
      floor_price: parseFloat(form.floor_price) || 0,
      publisher_name: form.publisher_name.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      workspace_id: workspaceId,
    };

    const res = await fetch("/api/rtb/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Erro ao criar deal.");
      return;
    }

    setForm(DEFAULT_FORM);
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Novo Deal
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)]">
        <DialogHeader>
          <DialogTitle>Novo PMP Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="deal_id" className="text-xs text-[color:var(--adflow-fg-muted)]">
                Deal ID *
              </Label>
              <Input
                id="deal_id"
                required
                value={form.deal_id}
                onChange={(e) => handleChange("deal_id", e.target.value)}
                placeholder="deal-001"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="deal_name" className="text-xs text-[color:var(--adflow-fg-muted)]">
                Nome do Deal *
              </Label>
              <Input
                id="deal_name"
                required
                value={form.deal_name}
                onChange={(e) => handleChange("deal_name", e.target.value)}
                placeholder="Premium Display"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="deal_type" className="text-xs text-[color:var(--adflow-fg-muted)]">
                Tipo
              </Label>
              <select
                id="deal_type"
                value={form.deal_type}
                onChange={(e) => handleChange("deal_type", e.target.value as PmpDealType)}
                className="h-8 rounded-md border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)] px-2 text-sm text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)]"
              >
                <option value="private">Privado</option>
                <option value="preferred">Preferencial</option>
                <option value="guaranteed">Garantido</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="floor_price" className="text-xs text-[color:var(--adflow-fg-muted)]">
                Floor Price (R$)
              </Label>
              <Input
                id="floor_price"
                type="number"
                min={0}
                step={0.01}
                value={form.floor_price}
                onChange={(e) => handleChange("floor_price", e.target.value)}
                placeholder="5.00"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="publisher_name" className="text-xs text-[color:var(--adflow-fg-muted)]">
              Publisher
            </Label>
            <Input
              id="publisher_name"
              value={form.publisher_name}
              onChange={(e) => handleChange("publisher_name", e.target.value)}
              placeholder="publisher.com"
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="start_date" className="text-xs text-[color:var(--adflow-fg-muted)]">
                Data de Início
              </Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="end_date" className="text-xs text-[color:var(--adflow-fg-muted)]">
                Data de Fim
              </Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => handleChange("end_date", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>
          )}

          <DialogFooter className="-mx-4 -mb-4 px-4 pb-4 mt-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Criando…" : "Criar Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Deals Table ──────────────────────────────────────────────────────────────

function DealsTable({ deals }: { deals: PmpDeal[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleToggle(deal: PmpDeal) {
    const newStatus: PmpDealStatus = deal.status === "active" ? "paused" : "active";
    await fetch(`/api/rtb/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este deal?")) return;
    await fetch(`/api/rtb/deals/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-12 text-center">
        <p className="text-sm text-[color:var(--adflow-fg-muted)]">
          Nenhum deal configurado. Crie o primeiro deal PMP.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--adflow-border)]">
              {["Deal ID", "Publisher", "Tipo", "Floor Price", "Status", "Início", "Fim", "Ações"].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--adflow-border)]">
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className="hover:bg-[color:var(--adflow-border)]/40 transition-colors"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--adflow-fg)]">
                  {deal.deal_id}
                </td>
                <td className="px-4 py-2.5 text-[color:var(--adflow-fg)]">
                  {deal.publisher_name ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusPill className={DEAL_TYPE_CLASSES[deal.deal_type]}>
                    {DEAL_TYPE_LABELS[deal.deal_type]}
                  </StatusPill>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-[color:var(--adflow-fg)]">
                  {formatBRL(deal.floor_price)}
                </td>
                <td className="px-4 py-2.5">
                  <StatusPill className={STATUS_CLASSES[deal.status]}>
                    {STATUS_LABELS[deal.status]}
                  </StatusPill>
                </td>
                <td className="px-4 py-2.5 text-[color:var(--adflow-fg-muted)] tabular-nums text-xs">
                  {formatDate(deal.start_date)}
                </td>
                <td className="px-4 py-2.5 text-[color:var(--adflow-fg-muted)] tabular-nums text-xs">
                  {formatDate(deal.end_date)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(deal)}
                      disabled={isPending || deal.status === "expired"}
                      title={deal.status === "active" ? "Pausar" : "Ativar"}
                      className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors disabled:opacity-40"
                    >
                      {deal.status === "active" ? (
                        <PauseCircle className="w-3.5 h-3.5" />
                      ) : (
                        <PlayCircle className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      disabled={isPending}
                      title="Remover"
                      className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-danger)] hover:bg-[color:var(--adflow-danger)]/10 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Composed client shell ────────────────────────────────────────────────────

export function DealsClient({
  deals,
  workspaceId,
}: {
  deals: PmpDeal[];
  workspaceId: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">PMP Deals</h1>
          <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-0.5">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} configurado{deals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewDealDialog workspaceId={workspaceId} />
      </div>
      <DealsTable deals={deals} />
    </>
  );
}
